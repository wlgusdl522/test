import { getSupabaseServerClient } from './server';

type TeamRow = { 값: string };

// 아직 생성된 Supabase 스키마 타입이 없어서(Phase 1에서 테이블이 늘어나면 정식으로 생성 예정),
// 지금은 이 테이블 하나에 한해 any로 캐스팅해서 쓴다.
function teamTable() {
  return getSupabaseServerClient().from('팀목록') as any;
}

export async function getTeamListFromSupabase(): Promise<string[] | null> {
  const { data, error } = await teamTable().select('값').order('순서', { ascending: true });
  if (error) {
    console.error('[Supabase 읽기 실패] 팀목록', error);
    return null; // 호출부가 시트로 폴백하도록 null 반환
  }
  return ((data ?? []) as TeamRow[]).map((row) => row.값);
}

export async function mirrorTeamListToSupabase(orderedValues: string[]): Promise<void> {
  const { data: current, error: readError } = await teamTable().select('값');
  if (readError) {
    console.error('[Supabase 미러 실패] 팀목록 현재 목록 조회', readError);
    return;
  }

  const removed = ((current ?? []) as TeamRow[])
    .map((row) => row.값)
    .filter((v) => !orderedValues.includes(v));

  if (removed.length > 0) {
    const { error: deleteError } = await teamTable().delete().in('값', removed);
    if (deleteError) console.error('[Supabase 미러 실패] 팀목록 삭제', deleteError);
  }

  if (orderedValues.length > 0) {
    const rows = orderedValues.map((value, index) => ({
      값: value,
      순서: index,
      updated_at: new Date().toISOString(),
    }));
    const { error: upsertError } = await teamTable().upsert(rows, { onConflict: '값' });
    if (upsertError) console.error('[Supabase 미러 실패] 팀목록 upsert', upsertError);
  }
}
