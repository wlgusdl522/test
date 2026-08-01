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

export async function getAllFromSupabase(
  config: SupabaseKeyedTableConfig
): Promise<Record<string, string>[] | null> {
  const { data, error } = await table(config.tableName).select('*');
  if (error) {
    console.error(`[Supabase 읽기 실패] ${config.tableName}`, error);
    return null;
  }
  return (data ?? []) as Record<string, string>[];
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
