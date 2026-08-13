import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_PLAN_TABLE } from '@/lib/sheets/registry';

export type BoardPlanEntry = {
  id: string;
  사업명: string;
  실시월일: string;
  내용: string;
  기대효과: string;
  정렬순서: number;
};

export type BoardPlanFields = { 사업명: string; 실시월일: string; 내용: string; 기대효과: string };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getBoardPlanEntries(): Promise<BoardPlanEntry[]> {
  const rows = await getKeyedList(BOARD_PLAN_TABLE);
  return rows
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id, 사업명: r.사업명, 실시월일: r.실시월일, 내용: r.내용, 기대효과: r.기대효과,
      정렬순서: num(r.정렬순서),
    }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function addBoardPlanEntry(data: BoardPlanFields): Promise<void> {
  const items = await getBoardPlanEntries();
  const nextOrder = Math.max(0, ...items.map((i) => i.정렬순서)) + 1;
  await addKeyedRecord(BOARD_PLAN_TABLE, { id: randomUUID(), ...data, 정렬순서: String(nextOrder) });
}

export async function updateBoardPlanEntry(id: string, data: BoardPlanFields): Promise<void> {
  const items = await getBoardPlanEntries();
  const existing = items.find((i) => i.id === id);
  if (!existing) return;
  await updateKeyedRecord(BOARD_PLAN_TABLE, { id }, { id, ...data, 정렬순서: String(existing.정렬순서) });
}

export async function deleteBoardPlanEntry(id: string): Promise<void> {
  await deleteKeyedRecord(BOARD_PLAN_TABLE, { id });
}

export async function moveBoardPlanEntry(id: string, direction: 'up' | 'down'): Promise<void> {
  const items = await getBoardPlanEntries();
  const idx = items.findIndex((i) => i.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
  const a = items[idx];
  const b = items[swapIdx];
  await updateKeyedRecord(BOARD_PLAN_TABLE, { id: a.id }, {
    id: a.id, 사업명: a.사업명, 실시월일: a.실시월일, 내용: a.내용, 기대효과: a.기대효과, 정렬순서: String(b.정렬순서),
  });
  await updateKeyedRecord(BOARD_PLAN_TABLE, { id: b.id }, {
    id: b.id, 사업명: b.사업명, 실시월일: b.실시월일, 내용: b.내용, 기대효과: b.기대효과, 정렬순서: String(a.정렬순서),
  });
}
