import { getSupabaseServerClient } from './server';

export async function getTeamListFromSupabase(): Promise<string[] | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('팀목록').select('값').order('순서', { ascending: true });
  if (error) {
    console.error('[Supabase 읽기 실패] 팀목록', error);
    return null; // 호출부가 시트로 폴백하도록 null 반환
  }
  return (data ?? []).map((row) => row.값 as string);
}

export async function mirrorTeamListToSupabase(orderedValues: string[]): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: current, error: readError } = await supabase.from('팀목록').select('값');
  if (readError) {
    console.error('[Supabase 미러 실패] 팀목록 현재 목록 조회', readError);
    return;
  }

  const removed = (current ?? [])
    .map((row) => row.값 as string)
    .filter((v) => !orderedValues.includes(v));

  if (removed.length > 0) {
    const { error: deleteError } = await supabase.from('팀목록').delete().in('값', removed);
    if (deleteError) console.error('[Supabase 미러 실패] 팀목록 삭제', deleteError);
  }

  if (orderedValues.length > 0) {
    const rows = orderedValues.map((value, index) => ({
      값: value,
      순서: index,
      updated_at: new Date().toISOString(),
    }));
    const { error: upsertError } = await supabase.from('팀목록').upsert(rows, { onConflict: '값' });
    if (upsertError) console.error('[Supabase 미러 실패] 팀목록 upsert', upsertError);
  }
}
