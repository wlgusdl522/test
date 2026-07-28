import { appendTeamToSheet, deleteTeamFromSheet, getTeamListFromSheet, moveTeamInSheet } from '@/lib/sheets/team';
import { getTeamListFromSupabase, mirrorTeamListToSupabase } from '@/lib/supabase/team';

// 읽기: 평소엔 Supabase에서, 실패하면 시트로 폴백(하이브리드 마이그레이션 때와 동일한 원칙).
export async function getTeamList(): Promise<string[]> {
  const fromSupabase = await getTeamListFromSupabase();
  if (fromSupabase !== null) return fromSupabase;
  return getTeamListFromSheet();
}

// 시트에 처음 만들어둔 팀목록을 Supabase로 최초 1회 채워 넣을 때 사용.
export async function seedTeamListFromSheet(): Promise<string[]> {
  const values = await getTeamListFromSheet();
  await mirrorTeamListToSupabase(values);
  return values;
}

async function afterSheetWrite(): Promise<string[]> {
  const all = await getTeamListFromSheet();
  await mirrorTeamListToSupabase(all);
  return all;
}

export async function addTeam(value: string): Promise<string[]> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('팀 이름을 입력해주세요.');
  await appendTeamToSheet(trimmed);
  return afterSheetWrite();
}

export async function deleteTeam(value: string): Promise<string[]> {
  await deleteTeamFromSheet(value);
  return afterSheetWrite();
}

export async function moveTeam(value: string, direction: 'up' | 'down'): Promise<string[]> {
  await moveTeamInSheet(value, direction);
  return afterSheetWrite();
}
