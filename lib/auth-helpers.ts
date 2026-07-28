import { auth } from '@/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const SUPERVISOR_POSITIONS = ['관장', '부장', '과장', '팀장'];
export const SENIOR_POSITIONS = ['관장', '부장'];
export const ADMIN_EMAILS = ['kwonzihyun@sdmsenior.or.kr'];

export async function requireViewerEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error('로그인이 필요합니다.');
  return email.toLowerCase();
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
