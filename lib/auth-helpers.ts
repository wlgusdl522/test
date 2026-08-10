import { auth } from '@/auth';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList } from '@/lib/mutate/keyedTable';
import { getSystemSettings } from '@/lib/mutate/settings';
import { ADMIN_LIST_TABLE } from '@/lib/sheets/registry';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeSupabaseRow } from '@/lib/supabase/keyedTable';

export const SUPERVISOR_POSITIONS = ['관장', '부장', '과장', '팀장'];
export const SENIOR_POSITIONS = ['관장', '부장'];

export async function requireViewerEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error('로그인이 필요합니다.');
  return email.toLowerCase();
}

// 관리자는 코드가 아니라 설정 > 권한설정 화면(관리자목록 시트)에서 관리한다 — 모든 권한 등급/전결/
// 사업 공유 제한을 무시하고 항상 전체 허용된다.
export async function getAdminList(): Promise<{ email: string; name: string }[]> {
  const rows = await getKeyedList(ADMIN_LIST_TABLE);
  return rows
    .map((r) => ({ email: (r.이메일 || '').toLowerCase(), name: r.성명 || '' }))
    .filter((r) => r.email);
}

export async function getAdminEmails(): Promise<string[]> {
  return (await getAdminList()).map((a) => a.email);
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const admins = await getAdminEmails();
  return admins.includes(email.toLowerCase());
}

export async function addAdmin(email: string, name: string): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (!(await isAdminEmail(viewerEmail))) throw new Error('관리자만 관리자를 추가할 수 있습니다.');
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error('이메일을 입력해주세요.');
  await addKeyedRecord(ADMIN_LIST_TABLE, { 이메일: trimmed, 성명: name });
}

// 실수로 관리자가 0명이 되어 아무도 다시 관리자를 지정할 수 없게 되는 상황을 막기 위해,
// 마지막 남은 관리자는 스스로도 제거할 수 없다 — 지우려면 먼저 다른 관리자를 추가해야 한다.
export async function removeAdmin(email: string): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (!(await isAdminEmail(viewerEmail))) throw new Error('관리자만 관리자를 제거할 수 있습니다.');
  const admins = await getAdminEmails();
  if (admins.length <= 1) {
    throw new Error('마지막 남은 관리자는 제거할 수 없습니다. 먼저 다른 관리자를 추가해주세요.');
  }
  await deleteKeyedRecord(ADMIN_LIST_TABLE, { 이메일: email.trim().toLowerCase() });
}

// 이메일(아이디) 컬럼명에 괄호가 들어있는데, PostgREST는 필터 파라미터의 컬럼명에 괄호가 있으면
// 함수 호출 문법으로 오인해서 엉뚱하게 파싱해버린다("column 직원관리.이메일 does not exist" 에러).
// 그래서 이 컬럼으로는 .eq() 필터를 절대 못 쓰고, 항상 전체를 읽어서 JS에서 걸러야 한다
// (직원관리는 수십~수백 행 규모라 전체 조회해도 부담 없음).
export async function getViewerStaffRecord(): Promise<Record<string, string> | null> {
  const email = await requireViewerEmail();
  const { data, error } = await getSupabaseServerClient().from('직원관리').select('*');
  if (error || !data) return null;
  const rows = (data as Record<string, unknown>[]).map(normalizeSupabaseRow);
  const match = rows.find((r) => (r['이메일(아이디)'] ?? '').toLowerCase() === email);
  return match ?? null;
}

async function getViewerPosition(email: string): Promise<string> {
  const me = await getViewerStaffRecord();
  if (!me || (me['이메일(아이디)'] ?? '').toLowerCase() !== email) return '';
  return me['직급/직책'] ?? '';
}

export async function requireCanManagePermissions(): Promise<void> {
  const email = await requireViewerEmail();
  if (await isAdminEmail(email)) return;
  const position = await getViewerPosition(email);
  if (!SUPERVISOR_POSITIONS.includes(position)) {
    throw new Error('권한설정은 관리자 또는 팀장급 이상만 사용할 수 있습니다.');
  }
}

// 본인 업무는 항상 체크 가능, 그 외엔 부서장(팀장/과장/부장/관장)만 — SENIOR_POSITIONS(관장/부장)는 전체 팀,
// 나머지 부서장(과장/팀장)은 본인 팀만 가능.
export async function requireCanToggleTask(taskEmail: string, taskTeam: string): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (taskEmail.toLowerCase() === viewerEmail) return;
  if (await isAdminEmail(viewerEmail)) return;

  const me = await getViewerStaffRecord();
  const position = me?.['직급/직책'] ?? '';
  if (!SUPERVISOR_POSITIONS.includes(position)) {
    throw new Error('다른 사람의 업무는 부서장(팀장/과장/부장/관장)만 확인할 수 있습니다.');
  }
  if (!SENIOR_POSITIONS.includes(position) && (!me || me['소속팀'] !== taskTeam)) {
    throw new Error('본인 팀 업무만 확인할 수 있습니다.');
  }
}

// 물품검수사진/조서의 "회계확인" 체크박스는 설정에서 지정한 회계담당자(또는 관리자)만 눌러서
// 켜고 끌 수 있고, 나머지 직원은 체크 여부만 읽기전용으로 본다.
export async function requireIsAccountingViewer(): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (await isAdminEmail(viewerEmail)) return;
  const { itemCheckAccountingEmail } = await getSystemSettings();
  if (!itemCheckAccountingEmail || itemCheckAccountingEmail.toLowerCase() !== viewerEmail) {
    throw new Error('회계확인은 회계담당자만 처리할 수 있습니다.');
  }
}

export async function isAccountingViewer(): Promise<boolean> {
  try {
    await requireIsAccountingViewer();
    return true;
  } catch {
    return false;
  }
}

// 증명서 발급대장은 관리자/회계담당자(회계는 물품검수조서와 같은 설정값 재사용)/서무담당자만 볼 수 있다.
export async function requireCanViewCertificateLog(): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (await isAdminEmail(viewerEmail)) return;
  const { itemCheckAccountingEmail, certificateClerkEmail } = await getSystemSettings();
  const allowed = [itemCheckAccountingEmail, certificateClerkEmail].map((e) => e.toLowerCase());
  if (!allowed.includes(viewerEmail)) {
    throw new Error('증명서 발급대장은 관리자, 회계담당자, 서무담당자만 볼 수 있습니다.');
  }
}

export async function canViewCertificateLog(): Promise<boolean> {
  try {
    await requireCanViewCertificateLog();
    return true;
  } catch {
    return false;
  }
}

export async function requireIsSupervisorForTeam(team: string): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (await isAdminEmail(viewerEmail)) return;

  const me = await getViewerStaffRecord();
  const position = me?.['직급/직책'] ?? '';
  if (!SUPERVISOR_POSITIONS.includes(position)) {
    throw new Error('부서장(팀장/과장/부장/관장)만 사용할 수 있습니다.');
  }
  if (!SENIOR_POSITIONS.includes(position) && (!me || me['소속팀'] !== team)) {
    throw new Error('본인 팀만 확인할 수 있습니다.');
  }
}
