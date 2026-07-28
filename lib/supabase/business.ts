import { getSupabaseServerClient } from './server';
import type { BusinessItem } from '@/lib/sheets/business';

type BusinessRow = { 사업명: string; 소관팀: string };

function businessTable() {
  return getSupabaseServerClient().from('사업목록') as any;
}

export async function getBusinessListFromSupabase(): Promise<BusinessItem[] | null> {
  const { data, error } = await businessTable().select('사업명, 소관팀').order('순서', { ascending: true });
  if (error) {
    console.error('[Supabase 읽기 실패] 사업목록', error);
    return null;
  }
  return ((data ?? []) as BusinessRow[]).map((row) => ({ name: row.사업명, team: row.소관팀 }));
}

export async function mirrorBusinessListToSupabase(items: BusinessItem[]): Promise<void> {
  const { data: current, error: readError } = await businessTable().select('사업명');
  if (readError) {
    console.error('[Supabase 미러 실패] 사업목록 현재 목록 조회', readError);
    return;
  }

  const currentNames = ((current ?? []) as { 사업명: string }[]).map((row) => row.사업명);
  const names = items.map((b) => b.name);
  const removed = currentNames.filter((n) => !names.includes(n));

  if (removed.length > 0) {
    const { error: deleteError } = await businessTable().delete().in('사업명', removed);
    if (deleteError) console.error('[Supabase 미러 실패] 사업목록 삭제', deleteError);
  }

  if (items.length > 0) {
    const rows = items.map((item, index) => ({
      사업명: item.name,
      소관팀: item.team,
      순서: index,
      updated_at: new Date().toISOString(),
    }));
    const { error: upsertError } = await businessTable().upsert(rows, { onConflict: '사업명' });
    if (upsertError) console.error('[Supabase 미러 실패] 사업목록 upsert', upsertError);
  }
}
