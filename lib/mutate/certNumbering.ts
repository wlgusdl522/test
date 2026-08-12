import { getSetting, setSetting } from '@/lib/supabase/settings';

// 증명서·상장이 공유하는 연도별 채번 시퀀스 — "제 {문서번호}호" 형식으로 표시한다(예: 2026-001).
// 당직 배정 커서(lib/supabase/duty.ts)와 동일한 read-modify-write 카운터 방식.
export async function nextCertificateNumber(date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const key = `CERT_ISSUE_SEQ_${year}`;
  const seq = (parseInt((await getSetting(key)) || '0', 10) || 0) + 1;
  await setSetting(key, String(seq));
  return `${year}-${String(seq).padStart(3, '0')}`;
}
