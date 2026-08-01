import { getSupabaseServerClient } from './server';

type SimpleListRow = { 값: string };

// 팀목록/직급목록/결재라인처럼 (값, 순서) 두 컬럼만 갖는 테이블 공용.
// 아직 생성된 Supabase 스키마 타입이 없어서 any로 캐스팅해서 쓴다.
function simpleListTable(tableName: string) {
  return getSupabaseServerClient().from(tableName) as any;
}

export async function getSimpleListFromSupabase(tableName: string): Promise<string[] | null> {
  const { data, error } = await simpleListTable(tableName).select('값').order('순서', { ascending: true });
  if (error) {
    console.error(`[Supabase 읽기 실패] ${tableName}`, error);
    return null; // 호출부가 시트로 폴백하도록 null 반환
  }
  return ((data ?? []) as SimpleListRow[]).map((row) => row.값);
}

export async function mirrorSimpleListToSupabase(tableName: string, orderedValues: string[]): Promise<void> {
  const { data: current, error: readError } = await simpleListTable(tableName).select('값');
  if (readError) {
    console.error(`[Supabase 미러 실패] ${tableName} 현재 목록 조회`, readError);
    return;
  }

  const removed = ((current ?? []) as SimpleListRow[])
    .map((row) => row.값)
    .filter((v) => !orderedValues.includes(v));

  if (removed.length > 0) {
    const { error: deleteError } = await simpleListTable(tableName).delete().in('값', removed);
    if (deleteError) console.error(`[Supabase 미러 실패] ${tableName} 삭제`, deleteError);
  }

  if (orderedValues.length > 0) {
    const rows = orderedValues.map((value, index) => ({ 값: value, 순서: index }));
    const { error: upsertError } = await simpleListTable(tableName).upsert(rows, { onConflict: '값' });
    if (upsertError) console.error(`[Supabase 미러 실패] ${tableName} upsert`, upsertError);
  }
}
