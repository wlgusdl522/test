import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList } from '@/lib/mutate/keyedTable';
import { BUSINESS_SHARE_TABLE } from '@/lib/sheets/registry';

export async function getAllBusinessShares(): Promise<Record<string, string[]>> {
  const rows = await getKeyedList(BUSINESS_SHARE_TABLE);
  const map: Record<string, string[]> = {};
  rows.forEach((r) => {
    const list = map[r.사업명] ?? (map[r.사업명] = []);
    list.push(r.이메일.toLowerCase());
  });
  return map;
}

export async function getBusinessNamesSharedWith(email: string): Promise<string[]> {
  const rows = await getKeyedList(BUSINESS_SHARE_TABLE);
  const lower = email.toLowerCase();
  return rows.filter((r) => r.이메일.toLowerCase() === lower).map((r) => r.사업명);
}

// 체크박스로 받은 최종 공유 대상 목록과 시트의 현재 상태를 비교해서 빠진 사람은 지우고 새로
// 추가된 사람만 더한다 — 매번 전체를 지우고 다시 쓰지 않아도 되게.
export async function setBusinessShares(
  사업명: string,
  emails: string[],
  staffByEmail: Map<string, string>
): Promise<void> {
  const rows = await getKeyedList(BUSINESS_SHARE_TABLE);
  const current = rows.filter((r) => r.사업명 === 사업명);
  const wanted = new Set(emails.map((e) => e.toLowerCase()).filter(Boolean));
  const currentEmails = new Set(current.map((r) => r.이메일.toLowerCase()));

  for (const row of current) {
    if (!wanted.has(row.이메일.toLowerCase())) {
      await deleteKeyedRecord(BUSINESS_SHARE_TABLE, { 사업명: row.사업명, 이메일: row.이메일 });
    }
  }
  for (const email of wanted) {
    if (!currentEmails.has(email)) {
      await addKeyedRecord(BUSINESS_SHARE_TABLE, {
        id: randomUUID(), 사업명, 이메일: email, 성명: staffByEmail.get(email) ?? '',
      });
    }
  }
}
