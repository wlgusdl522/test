import { getSupabaseServerClient } from './server';

function settingsTable() {
  return getSupabaseServerClient().from('설정') as any;
}

export async function getSetting(key: string): Promise<string> {
  const { data, error } = await settingsTable().select('값').eq('키', key).maybeSingle();
  if (error || !data) return '';
  return data.값 ?? '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { error } = await settingsTable().upsert(
    { 키: key, 값: value, updated_at: new Date().toISOString() },
    { onConflict: '키' }
  );
  if (error) throw new Error(`설정 저장 실패: ${error.message}`);
}
