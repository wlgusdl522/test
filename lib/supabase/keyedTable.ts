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
    const rows = records.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const { error: upsertError } = await table(config.tableName).upsert(rows, {
      onConflict: keyColumns(config).join(','),
    });
    if (upsertError) console.error(`[Supabase 미러 실패] ${config.tableName} upsert`, upsertError);
  }
}
