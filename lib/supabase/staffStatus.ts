import { getSupabaseServerClient } from './server';

// 홈 화면의 실시간 "부재중" 토글 — 시트 없이 Supabase가 원본(당직과 동일한 예외 패턴).
// 직원별 최신 상태 1행만 유지한다(이력 없음, 단순 플래그형).

export type StaffStatusRow = {
  이메일: string;
  성명: string;
  소속팀: string;
  상태: string;
  사유: string;
  변경시각: string;
};

function table() {
  return getSupabaseServerClient().from('부재중현황') as any;
}

export async function getAwayStaff(): Promise<StaffStatusRow[]> {
  const { data, error } = await table().select('*').eq('상태', '부재중');
  if (error) throw new Error(`부재중현황 조회 실패: ${error.message}`);
  return (data ?? []) as StaffStatusRow[];
}

export async function setAwayStatus(email: string, name: string, team: string, reason: string): Promise<void> {
  const { error } = await table().upsert(
    { 이메일: email, 성명: name, 소속팀: team, 상태: '부재중', 사유: reason, 변경시각: new Date().toISOString() },
    { onConflict: '이메일' }
  );
  if (error) throw new Error(`부재중 상태 저장 실패: ${error.message}`);
}

export async function clearAwayStatus(email: string, name: string, team: string): Promise<void> {
  const { error } = await table().upsert(
    { 이메일: email, 성명: name, 소속팀: team, 상태: '재실', 사유: '', 변경시각: new Date().toISOString() },
    { onConflict: '이메일' }
  );
  if (error) throw new Error(`복귀 처리 실패: ${error.message}`);
}
