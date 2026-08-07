import { getKeyedList, deleteKeyedRecord, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { getStaffList } from '@/lib/mutate/staff';
import { PAGE_ACCESS_EXCEPTION_TABLE, PAGE_ACCESS_TABLE } from '@/lib/sheets/registry';
import {
  SENIOR_POSITIONS,
  SUPERVISOR_POSITIONS,
  getViewerStaffRecord,
  isAdminEmail,
  requireCanManagePermissions,
  requireViewerEmail,
} from '@/lib/auth-helpers';
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

// "이메일(아이디)" 컬럼명의 괄호를 PostgREST가 관계형 조인(embed) 문법으로 오인해서
// select() 절에 직접 넣으면 조회 자체가 실패한다 — 전체를 읽는 getStaffList()를 재사용한다.
export async function getActiveStaffList(): Promise<ActiveStaff[]> {
  const all = await getStaffList();
  return all
    .filter((r) => r['재직상태'] === '재직')
    .map((r) => ({ email: r['이메일(아이디)'], name: r['성명'], team: r['소속팀'] }));
}

// 총괄업무일지 공유 대상은 관리팀 4개 소속 직원만 고르면 되고, 팀별로 묶어서 보여주면 찾기 쉽다.
export const SHAREABLE_TEAMS = ['복지1팀', '복지2팀', '복지3팀', '총무팀'];

export async function getShareableStaffGroups(): Promise<{ team: string; staff: ActiveStaff[] }[]> {
  const all = await getActiveStaffList();
  return SHAREABLE_TEAMS.map((team) => ({ team, staff: all.filter((s) => s.team === team) }));
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

// 설정 > 권한설정에서 지정한 등급/예외를 실제로 페이지 렌더링 시점에 확인한다.
// 규칙이 아예 없으면(신규 등록 페이지) 기본값은 "전체"(모두 허용).
export async function hasPageAccess(pageId: string): Promise<boolean> {
  const viewerEmail = await requireViewerEmail();
  if (await isAdminEmail(viewerEmail)) return true;

  const [rules, exceptions] = await Promise.all([getPageAccessRuleMap(), getPageAccessExceptionMap()]);
  if ((exceptions[pageId] ?? []).includes(viewerEmail)) return true;

  const tier = rules[pageId] ?? '전체';
  if (tier === '전체') return true;

  const position = (await getViewerStaffRecord())?.['직급/직책'] ?? '';
  if (tier === '관장부장만') return SENIOR_POSITIONS.includes(position);
  if (tier === '팀장이상') return SUPERVISOR_POSITIONS.includes(position);
  return true;
}
