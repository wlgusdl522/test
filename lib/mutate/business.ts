import {
  appendBusinessToSheet,
  deleteBusinessFromSheet,
  getBusinessListFromSheet,
  type BusinessItem,
} from '@/lib/sheets/business';
import { getBusinessListFromSupabase, mirrorBusinessListToSupabase } from '@/lib/supabase/business';

export async function getBusinessList(): Promise<BusinessItem[]> {
  const fromSupabase = await getBusinessListFromSupabase();
  if (fromSupabase !== null) return fromSupabase;
  return getBusinessListFromSheet();
}

export async function seedBusinessListFromSheet(): Promise<BusinessItem[]> {
  const items = await getBusinessListFromSheet();
  await mirrorBusinessListToSupabase(items);
  return items;
}

async function afterSheetWrite(): Promise<BusinessItem[]> {
  const all = await getBusinessListFromSheet();
  await mirrorBusinessListToSupabase(all);
  return all;
}

export async function addBusiness(name: string, team: string): Promise<BusinessItem[]> {
  const trimmedName = name.trim();
  const trimmedTeam = team.trim();
  if (!trimmedName || !trimmedTeam) throw new Error('사업명과 소관팀을 입력해주세요.');
  await appendBusinessToSheet(trimmedName, trimmedTeam);
  return afterSheetWrite();
}

export async function deleteBusiness(name: string): Promise<BusinessItem[]> {
  await deleteBusinessFromSheet(name);
  return afterSheetWrite();
}
