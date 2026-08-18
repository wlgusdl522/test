import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_BANK_ACCOUNT_TABLE } from '@/lib/sheets/registry';

// 예금잔액명세 계좌 목록 — 은행명/계좌번호/비고는 거의 안 바뀌는 메타데이터라 따로 관리하고,
// 매달 바뀌는 잔액값은 이사회월별값에 계좌 id를 항목ID 자리에 그대로 재사용해서 저장한다
// (boardStat.ts의 getModuleValues/setModuleValues/valueFor를 그대로 쓸 수 있어서).
export type BankAccount = {
  id: string;
  시설: string;
  은행명: string;
  계좌번호: string;
  비고: string;
  정렬순서: number;
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getBankAccounts(시설: string): Promise<BankAccount[]> {
  const rows = await getKeyedList(BOARD_BANK_ACCOUNT_TABLE);
  return rows
    .filter((r) => r.시설 === 시설 && r.id)
    .map((r) => ({ id: r.id, 시설: r.시설, 은행명: r.은행명, 계좌번호: r.계좌번호, 비고: r.비고, 정렬순서: num(r.정렬순서) }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function addBankAccount(시설: string, 은행명: string, 계좌번호: string, 비고: string): Promise<void> {
  const items = await getBankAccounts(시설);
  const nextOrder = Math.max(0, ...items.map((i) => i.정렬순서)) + 1;
  await addKeyedRecord(BOARD_BANK_ACCOUNT_TABLE, {
    id: randomUUID(), 시설, 은행명: 은행명.trim(), 계좌번호: 계좌번호.trim(), 비고: 비고.trim(), 정렬순서: String(nextOrder),
  });
}

export async function deleteBankAccount(id: string): Promise<void> {
  await deleteKeyedRecord(BOARD_BANK_ACCOUNT_TABLE, { id });
}

export async function moveBankAccount(시설: string, id: string, direction: 'up' | 'down'): Promise<void> {
  const items = await getBankAccounts(시설);
  const idx = items.findIndex((i) => i.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
  const a = items[idx];
  const b = items[swapIdx];
  await updateKeyedRecord(
    BOARD_BANK_ACCOUNT_TABLE, { id: a.id },
    { id: a.id, 시설: a.시설, 은행명: a.은행명, 계좌번호: a.계좌번호, 비고: a.비고, 정렬순서: String(b.정렬순서) }
  );
  await updateKeyedRecord(
    BOARD_BANK_ACCOUNT_TABLE, { id: b.id },
    { id: b.id, 시설: b.시설, 은행명: b.은행명, 계좌번호: b.계좌번호, 비고: b.비고, 정렬순서: String(a.정렬순서) }
  );
}
