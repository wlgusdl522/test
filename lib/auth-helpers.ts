import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSystemSettings } from '@/lib/mutate/settings';

export const SUPERVISOR_POSITIONS = ['관장', '부장', '과장', '팀장'];
export const SENIOR_POSITIONS = ['관장', '부장'];
export const ADMIN_EMAILS = ['kwonzihyun@sdmsenior.or.kr'];

export async function requireViewerEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error('로그인이 필요합니다.');
  return email.toLowerCase();
}

export async function getViewerStaffRecord(): Promise<Record<string, string> | null> {
  const email = await requireViewerEmail();
  const { data, error } = await getSupabaseServerClient()
    .from('직원관리')
    .select('*')
    .eq('이메일(아이디)', email)
    .maybeSingle();
  if (error || !data) return null;
  return data as Record<string, string>;
}

async function getViewerPosition(email: string): Promise<string> {
  const { data, error } = await getSupabaseServerClient()
    .from('직원관리')
    .select('직급/직책')
    .eq('이메일(아이디)', email)
    .maybeSingle();
  if (error || !data) return '';
  return (data as any)['직급/직책'] ?? '';
}

export async function requireCanManagePermissions(): Promise<void> {
  const email = await requireViewerEmail();
  if (ADMIN_EMAILS.includes(email)) return;
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
  if (ADMIN_EMAILS.includes(viewerEmail)) return;

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
  if (ADMIN_EMAILS.includes(viewerEmail)) return;
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

export async function requireIsSupervisorForTeam(team: string): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (ADMIN_EMAILS.includes(viewerEmail)) return;

  const me = await getViewerStaffRecord();
  const position = me?.['직급/직책'] ?? '';
  if (!SUPERVISOR_POSITIONS.includes(position)) {
    throw new Error('부서장(팀장/과장/부장/관장)만 사용할 수 있습니다.');
  }
  if (!SENIOR_POSITIONS.includes(position) && (!me || me['소속팀'] !== team)) {
    throw new Error('본인 팀만 확인할 수 있습니다.');
  }
}
