import { getSupabaseServerClient } from './server';

export type SupabaseKeyedTableConfig = {
  tableName: string;
  primaryKey: string | string[];
};

function keyColumns(config: SupabaseKeyedTableConfig): string[] {
  return Array.isArray(config.primaryKey) ? config.primaryKey : [config.primaryKey];
}

function table(tableName: string) {
  return getSupabaseServerClient().from(tableName) as any;
}

function recordKey(config: SupabaseKeyedTableConfig, record: Record<string, string>): string {
  return keyColumns(config)
    .map((col) => record[col])
    .join('::');
}

// PostgREST는 필터/on_conflict 파라미터의 컬럼명에 괄호가 있으면 함수호출 문법으로 오인해서
// 파싱에 실패한다(예: "이메일(아이디)" -> "column 이메일 does not exist"). 이런 기본키를 쓰는
// 테이블(직원관리)은 행 단위 .eq() 삭제/upsert 충돌판정을 아예 못 쓰므로 전체삭제+재삽입으로 우회한다.
const UNSAFE_COLUMN_CHARS = /[()]/;

function hasUnsafeKeyColumn(config: SupabaseKeyedTableConfig): boolean {
  return keyColumns(config).some((col) => UNSAFE_COLUMN_CHARS.test(col));
}

function pickSafeFilterColumn(sample: Record<string, string> | undefined): string | null {
  if (!sample) return null;
  const col = Object.keys(sample).find(
    (c) => !UNSAFE_COLUMN_CHARS.test(c) && c !== 'updated_at' && c !== '_synced_at'
  );
  return col ?? null;
}

// PostgREST는 boolean 컬럼을 실제 JS boolean으로 내려준다(구글시트에서 읽을 때는 항상 문자열이라
// 나머지 코드 전체가 `=== 'TRUE'`로 비교함). true/false를 그대로 두면 이 비교가 항상 거짓이 되므로,
// 시트에서 읽을 때와 똑같은 'TRUE'/'FALSE' 문자열로 맞춰준다.
function normalizeSupabaseValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

export function normalizeSupabaseRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) out[k] = normalizeSupabaseValue(v);
  return out;
}

export async function getAllFromSupabase(
  config: SupabaseKeyedTableConfig
): Promise<Record<string, string>[] | null> {
  const { data, error } = await table(config.tableName).select('*');
  if (error) {
    console.error(`[Supabase 읽기 실패] ${config.tableName}`, error);
    return null;
  }
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeSupabaseRow);
}

// mirrorKeyedTableToSupabase처럼 테이블 전체를 다시 읽어 diff하지 않고, 지금 막 시트에 쓴
// 행(들)만 그대로 올린다 — 다른 행에 스키마/데이터 문제가 있어도 방금 쓴 이 행은 영향을 안 받고,
// 매번 테이블 전체를 훑지 않아 훨씬 가볍다. (괄호 등 안전하지 않은 키 컬럼을 쓰는 테이블은
// on_conflict 파라미터 파싱이 깨지므로 이 헬퍼 대상에서 제외 — 호출하는 쪽에서 알아서 그런
// 테이블에는 쓰지 않아야 한다.)
export async function upsertRowsToSupabase(
  config: SupabaseKeyedTableConfig,
  records: Record<string, string>[]
): Promise<void> {
  if (records.length === 0) return;
  if (hasUnsafeKeyColumn(config)) {
    console.error(`[Supabase 건별 upsert 실패] ${config.tableName}: 괄호 등 안전하지 않은 키 컬럼은 건별 upsert를 지원하지 않습니다.`);
    return;
  }
  const { error } = await table(config.tableName).upsert(records, {
    onConflict: keyColumns(config).join(','),
  });
  if (error) console.error(`[Supabase 건별 upsert 실패] ${config.tableName}`, error);
}

// 위와 짝을 이루는 건별 삭제 — 삭제 대상 키들만 지워서 확인한다.
export async function deleteRowsFromSupabase(
  config: SupabaseKeyedTableConfig,
  keyValuesList: Record<string, string>[]
): Promise<void> {
  for (const keyValues of keyValuesList) {
    let query = table(config.tableName).delete();
    for (const [col, value] of Object.entries(keyValues)) {
      query = query.eq(col, value);
    }
    const { error } = await query;
    if (error) console.error(`[Supabase 건별 삭제 실패] ${config.tableName}`, error);
  }
}

export async function mirrorKeyedTableToSupabase(
  config: SupabaseKeyedTableConfig,
  records: Record<string, string>[]
): Promise<void> {
  const { data: current, error: readError } = await table(config.tableName).select('*');
  if (readError) {
    console.error(`[Supabase 미러 실패] ${config.tableName} 현재 목록 조회`, readError);
    return;
  }

  if (hasUnsafeKeyColumn(config)) {
    const safeCol = pickSafeFilterColumn(((current as Record<string, string>[] | null) ?? [])[0] ?? records[0]);
    if (safeCol) {
      const { error: deleteAllError } = await table(config.tableName).delete().not(safeCol, 'is', null);
      if (deleteAllError) console.error(`[Supabase 미러 실패] ${config.tableName} 전체 삭제`, deleteAllError);
    }
    if (records.length > 0) {
      const { error: insertError } = await table(config.tableName).insert(records);
      if (insertError) console.error(`[Supabase 미러 실패] ${config.tableName} 재삽입`, insertError);
    }
    return;
  }

  const newKeySet = new Set(records.map((r) => recordKey(config, r)));
  const removedIndexes = ((current ?? []) as Record<string, string>[])
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !newKeySet.has(recordKey(config, r)));

  for (const { r } of removedIndexes) {
    const filter: Record<string, string> = {};
    keyColumns(config).forEach((col) => {
      filter[col] = r[col];
    });
    let query = table(config.tableName).delete();
    for (const [col, value] of Object.entries(filter)) {
      query = query.eq(col, value);
    }
    const { error } = await query;
    if (error) console.error(`[Supabase 미러 실패] ${config.tableName} 삭제`, error);
  }

  if (records.length > 0) {
    const { error: upsertError } = await table(config.tableName).upsert(records, {
      onConflict: keyColumns(config).join(','),
    });
    if (upsertError) console.error(`[Supabase 미러 실패] ${config.tableName} upsert`, upsertError);
  }
}
