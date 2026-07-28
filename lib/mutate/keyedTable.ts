import { appendRecord, deleteRecord, getAllRecords, updateRecord, type KeyedTableConfig } from '@/lib/sheets/keyedTable';
import { getAllFromSupabase, mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';

// Supabase 테이블 이름은 항상 시트 탭 이름과 동일하다는 규칙(레지스트리 전체의 확립된 원칙)을 그대로 따른다.
function supabaseConfigFor(config: KeyedTableConfig) {
  return { tableName: config.sheetName, primaryKey: config.primaryKey };
}

export async function getKeyedList(config: KeyedTableConfig): Promise<Record<string, string>[]> {
  const fromSupabase = await getAllFromSupabase(supabaseConfigFor(config));
  if (fromSupabase !== null) return fromSupabase;
  return getAllRecords(config);
}

export async function seedKeyedListFromSheet(config: KeyedTableConfig): Promise<Record<string, string>[]> {
  const all = await getAllRecords(config);
  await mirrorKeyedTableToSupabase(supabaseConfigFor(config), all);
  return all;
}

async function afterSheetWrite(config: KeyedTableConfig): Promise<Record<string, string>[]> {
  const all = await getAllRecords(config);
  await mirrorKeyedTableToSupabase(supabaseConfigFor(config), all);
  return all;
}

export async function addKeyedRecord(
  config: KeyedTableConfig,
  record: Record<string, string>
): Promise<Record<string, string>[]> {
  await appendRecord(config, record);
  return afterSheetWrite(config);
}

export async function updateKeyedRecord(
  config: KeyedTableConfig,
  keyValues: Record<string, string>,
  record: Record<string, string>
): Promise<Record<string, string>[]> {
  await updateRecord(config, keyValues, record);
  return afterSheetWrite(config);
}

export async function deleteKeyedRecord(
  config: KeyedTableConfig,
  keyValues: Record<string, string>
): Promise<Record<string, string>[]> {
  await deleteRecord(config, keyValues);
  return afterSheetWrite(config);
}
