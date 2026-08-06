import { ADMIN_EMAILS, getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
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

// 총괄업무일지(사업관리)는 직원관리의 "담당사업"에 등록된 사업만 보여준다 — 관리자는 전체.
// 나눔참여(후원)/나눔참여(자원봉사)처럼 사업목록을 여러 개로 나눠 담당자를 다르게 배정하거나,
// 여러 직원이 같은 사업을 공유하고 싶으면 각자의 직원관리 > 담당사업에 그 사업명을 추가하면 된다.
export async function getViewerBusinessList(): Promise<BusinessItem[]> {
  const email = await requireViewerEmail();
  const all = await getBusinessList();
  if (ADMIN_EMAILS.includes(email)) return all;
  const me = await getViewerStaffRecord();
  const mine = (me?.담당사업 ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return all.filter((b) => mine.includes(b.name));
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
