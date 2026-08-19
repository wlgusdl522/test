import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, deleteKeyedRecords, getKeyedList, updateKeyedRecord, upsertKeyedRecords } from '@/lib/mutate/keyedTable';
import { BOARD_BUDGET_ITEM_TABLE, BOARD_BUDGET_VALUE_TABLE } from '@/lib/sheets/registry';

// 회계 "예산집행현황" — 항목은 시설별로 관리(추가/삭제/순서변경)하고, 예산액/집행액/누계/비고는
// 전부 담당자가 매달 직접 입력한다. 수입지출현황 데이터에서 자동 계산하지 않는 이유는 사업비 중
// 기본사업비/특정보조사업비 구분처럼 이름만으로는 추론 불가능한 재원 판단이 섞여있어서다.
export type BudgetItem = { id: string; 시설: string; 항목명: string; 정렬순서: number };
export type BudgetRow = { 항목ID: string; 항목명: string; 예산액: number; 집행액: number; 누계: number; 비고: string };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getBudgetItems(시설: string): Promise<BudgetItem[]> {
  const rows = await getKeyedList(BOARD_BUDGET_ITEM_TABLE);
  return rows
    .filter((r) => r.시설 === 시설 && r.id)
    .map((r) => ({ id: r.id, 시설: r.시설, 항목명: r.항목명, 정렬순서: num(r.정렬순서) }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function addBudgetItem(시설: string, 항목명: string): Promise<void> {
  const items = await getBudgetItems(시설);
  const nextOrder = Math.max(0, ...items.map((i) => i.정렬순서)) + 1;
  await addKeyedRecord(BOARD_BUDGET_ITEM_TABLE, {
    id: randomUUID(), 시설, 항목명: 항목명.trim() || '새 항목', 정렬순서: String(nextOrder),
  });
}

export async function deleteBudgetItem(id: string): Promise<void> {
  await deleteKeyedRecord(BOARD_BUDGET_ITEM_TABLE, { id });
}

export async function moveBudgetItem(시설: string, id: string, direction: 'up' | 'down'): Promise<void> {
  const items = await getBudgetItems(시설);
  const idx = items.findIndex((i) => i.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
  const a = items[idx];
  const b = items[swapIdx];
  await updateKeyedRecord(BOARD_BUDGET_ITEM_TABLE, { id: a.id }, { id: a.id, 시설: a.시설, 항목명: a.항목명, 정렬순서: String(b.정렬순서) });
  await updateKeyedRecord(BOARD_BUDGET_ITEM_TABLE, { id: b.id }, { id: b.id, 시설: b.시설, 항목명: b.항목명, 정렬순서: String(a.정렬순서) });
}

export async function getBudgetRows(시설: string, ym: string): Promise<BudgetRow[]> {
  const [items, rows] = await Promise.all([getBudgetItems(시설), getKeyedList(BOARD_BUDGET_VALUE_TABLE)]);
  return items.map((item) => {
    const v = rows.find((r) => r.항목ID === item.id && r.시설 === 시설 && r.년월 === ym);
    return {
      항목ID: item.id, 항목명: item.항목명,
      예산액: num(v?.예산액), 집행액: num(v?.집행액), 누계: num(v?.누계), 비고: v?.비고 || '',
    };
  });
}

export async function saveBudgetRows(
  시설: string, ym: string,
  entries: { 항목ID: string; 예산액: number; 집행액: number; 누계: number; 비고: string }[]
): Promise<void> {
  const rows = await getKeyedList(BOARD_BUDGET_VALUE_TABLE);
  const toDelete: { 항목ID: string; 시설: string; 년월: string }[] = [];
  const toUpsert: { keyValues: Record<string, string>; record: Record<string, string> }[] = [];

  for (const e of entries) {
    const existing = rows.find((r) => r.항목ID === e.항목ID && r.시설 === 시설 && r.년월 === ym);
    const 비고 = e.비고.trim();
    if (!e.예산액 && !e.집행액 && !e.누계 && !비고) {
      if (existing) toDelete.push({ 항목ID: e.항목ID, 시설, 년월: ym });
      continue;
    }
    toUpsert.push({
      keyValues: { 항목ID: e.항목ID, 시설, 년월: ym },
      record: {
        id: existing?.id || randomUUID(),
        항목ID: e.항목ID, 시설, 년월: ym,
        예산액: String(e.예산액 || 0), 집행액: String(e.집행액 || 0), 누계: String(e.누계 || 0), 비고,
      },
    });
  }

  if (toDelete.length > 0) await deleteKeyedRecords(BOARD_BUDGET_VALUE_TABLE, toDelete);
  if (toUpsert.length > 0) await upsertKeyedRecords(BOARD_BUDGET_VALUE_TABLE, toUpsert);
}
