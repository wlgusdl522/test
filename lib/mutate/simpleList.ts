import {
  appendSimpleListItem,
  deleteSimpleListItem as deleteSheetItem,
  getSimpleListFromSheet,
  moveSimpleListItem as moveSheetItem,
} from '@/lib/sheets/simpleList';
import { getSimpleListFromSupabase, mirrorSimpleListToSupabase } from '@/lib/supabase/simpleList';

// listName은 시트 탭 이름이자 Supabase 테이블 이름으로 그대로 쓰인다 (팀목록/직급목록/결재라인).

export async function getSimpleList(listName: string): Promise<string[]> {
  const fromSupabase = await getSimpleListFromSupabase(listName);
  if (fromSupabase !== null) return fromSupabase;
  return getSimpleListFromSheet(listName);
}

export async function seedSimpleListFromSheet(listName: string): Promise<string[]> {
  const values = await getSimpleListFromSheet(listName);
  await mirrorSimpleListToSupabase(listName, values);
  return values;
}

async function afterSheetWrite(listName: string): Promise<string[]> {
  const all = await getSimpleListFromSheet(listName);
  await mirrorSimpleListToSupabase(listName, all);
  return all;
}

export async function addSimpleListItem(listName: string, value: string): Promise<string[]> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('값을 입력해주세요.');
  await appendSimpleListItem(listName, trimmed);
  return afterSheetWrite(listName);
}

export async function deleteSimpleListItem(listName: string, value: string): Promise<string[]> {
  await deleteSheetItem(listName, value);
  return afterSheetWrite(listName);
}

export async function moveSimpleListItem(
  listName: string,
  value: string,
  direction: 'up' | 'down'
): Promise<string[]> {
  await moveSheetItem(listName, value, direction);
  return afterSheetWrite(listName);
}
