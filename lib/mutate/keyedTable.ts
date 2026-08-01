import {
  appendRecord,
  deleteRecord,
  deleteRecords,
  getAllRecords,
  updateRecord,
  upsertRecord,
  type KeyedTableConfig,
} from '@/lib/sheets/keyedTable';
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

export async function upsertKeyedRecord(
  config: KeyedTableConfig,
  keyValues: Record<string, string>,
  record: Record<string, string>
): Promise<Record<string, string>[]> {
  await upsertRecord(config, keyValues, record);
  return afterSheetWrite(config);
}

export async function deleteKeyedRecord(
  config: KeyedTableConfig,
  keyValues: Record<string, string>
): Promise<Record<string, string>[]> {
  await deleteRecord(config, keyValues);
  return afterSheetWrite(config);
}

// 여러 건을 한 번에 지울 때 — 건마다 deleteKeyedRecord를 반복 호출하면 매번 시트 읽기+쓰기+
// Supabase 미러링까지 다시 도는데, 이걸 N번 반복하면 대량 삭제 시 API 요청 한도에 걸려
// 일부만 지워지고 중단될 수 있다. 시트 삭제는 batchUpdate 하나로, 미러링도 마지막에 한 번만 한다.
export async function deleteKeyedRecords(
  config: KeyedTableConfig,
  keyValuesList: Record<string, string>[]
): Promise<Record<string, string>[]> {
  await deleteRecords(config, keyValuesList);
  return afterSheetWrite(config);
}
