import { getKeyedList, deleteKeyedRecord, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { PAGE_ACCESS_EXCEPTION_TABLE, PAGE_ACCESS_TABLE } from '@/lib/sheets/registry';
import { requireCanManagePermissions } from '@/lib/auth-helpers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PAGE_ACCESS_TIERS } from '@/lib/pages-registry';

export async function getPageAccessRuleMap(): Promise<Record<string, string>> {
  const rows = await getKeyedList(PAGE_ACCESS_TABLE);
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    map[r.페이지ID] = r.권한등급;
  });
  return map;
}

export async function getPageAccessExceptionMap(): Promise<Record<string, string[]>> {
  const rows = await getKeyedList(PAGE_ACCESS_EXCEPTION_TABLE);
  const map: Record<string, string[]> = {};
  rows.forEach((r) => {
    const list = map[r.페이지ID] ?? (map[r.페이지ID] = []);
    list.push(r.이메일.toLowerCase());
  });
  return map;
}

export type ActiveStaff = { email: string; name: string; team: string };

export async function getActiveStaffList(): Promise<ActiveStaff[]> {
  const { data, error } = await getSupabaseServerClient()
    .from('직원관리')
    .select('이메일(아이디), 성명, 소속팀, 재직상태');
  if (error) {
    console.error('[Supabase 읽기 실패] 직원관리(활성 목록)', error);
    return [];
  }
  return ((data ?? []) as any[])
    .filter((r) => r['재직상태'] === '재직')
    .map((r) => ({ email: r['이메일(아이디)'], name: r['성명'], team: r['소속팀'] }));
}

export async function setPageAccessRule(pageId: string, pageName: string, tier: string): Promise<void> {
  await requireCanManagePermissions();
  if (!PAGE_ACCESS_TIERS.some((t) => t.value === tier)) {
    throw new Error('잘못된 권한등급입니다.');
  }
  await upsertKeyedRecord(
    PAGE_ACCESS_TABLE,
    { 페이지ID: pageId },
    { 페이지ID: pageId, 페이지명: pageName, 권한등급: tier }
  );
}

export async function addPageAccessException(pageId: string, email: string): Promise<void> {
  await requireCanManagePermissions();
  const staff = (await getActiveStaffList()).find((s) => s.email === email);
  await upsertKeyedRecord(
    PAGE_ACCESS_EXCEPTION_TABLE,
    { 페이지ID: pageId, 이메일: email },
    { 페이지ID: pageId, 이메일: email, 성명: staff?.name ?? '', 비고: '' }
  );
}

export async function removePageAccessException(pageId: string, email: string): Promise<void> {
  await requireCanManagePermissions();
  await deleteKeyedRecord(PAGE_ACCESS_EXCEPTION_TABLE, { 페이지ID: pageId, 이메일: email });
}
