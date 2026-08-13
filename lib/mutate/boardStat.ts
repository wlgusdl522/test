import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_STAT_ITEM_TABLE, BOARD_STAT_VALUE_TABLE } from '@/lib/sheets/registry';

export type BoardStatModule = '회계' | '자원봉사자' | '후원';

export type BoardStatItem = { id: string; 모듈: string; 항목명: string; 정렬순서: number };
export type BoardStatValue = { 항목ID: string; 년월: string; 값: number };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getModuleItems(모듈: BoardStatModule): Promise<BoardStatItem[]> {
  const rows = await getKeyedList(BOARD_STAT_ITEM_TABLE);
  return rows
    .filter((r) => r.모듈 === 모듈 && r.id)
    .map((r) => ({ id: r.id, 모듈: r.모듈, 항목명: r.항목명, 정렬순서: num(r.정렬순서) }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function addModuleItem(모듈: BoardStatModule, 항목명: string): Promise<void> {
  const items = await getModuleItems(모듈);
  const nextOrder = Math.max(0, ...items.map((i) => i.정렬순서)) + 1;
  await addKeyedRecord(BOARD_STAT_ITEM_TABLE, {
    id: randomUUID(), 모듈, 항목명: 항목명.trim() || '새 항목', 정렬순서: String(nextOrder),
  });
}

export async function deleteModuleItem(id: string): Promise<void> {
  await deleteKeyedRecord(BOARD_STAT_ITEM_TABLE, { id });
}

// 같은 모듈 안에서 정렬순서 값을 이웃 항목과 맞바꿔 위/아래로 이동시킨다.
export async function moveModuleItem(모듈: BoardStatModule, id: string, direction: 'up' | 'down'): Promise<void> {
  const items = await getModuleItems(모듈);
  const idx = items.findIndex((i) => i.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
  const a = items[idx];
  const b = items[swapIdx];
  await updateKeyedRecord(BOARD_STAT_ITEM_TABLE, { id: a.id }, { id: a.id, 모듈: a.모듈, 항목명: a.항목명, 정렬순서: String(b.정렬순서) });
  await updateKeyedRecord(BOARD_STAT_ITEM_TABLE, { id: b.id }, { id: b.id, 모듈: b.모듈, 항목명: b.항목명, 정렬순서: String(a.정렬순서) });
}

export async function getModuleValues(항목IDs: string[]): Promise<BoardStatValue[]> {
  const rows = await getKeyedList(BOARD_STAT_VALUE_TABLE);
  const idSet = new Set(항목IDs);
  return rows.filter((r) => idSet.has(r.항목ID)).map((r) => ({ 항목ID: r.항목ID, 년월: r.년월, 값: num(r.값) }));
}

// 값이 0/빈칸이면 굳이 시트에 빈 행을 남기지 않고 지운다 — 일일실적의 setDailyEntry와 동일한 동작.
export async function setModuleValue(
  항목ID: string,
  년월: string,
  값: number,
  writerEmail: string,
  writerName: string
): Promise<void> {
  const rows = await getKeyedList(BOARD_STAT_VALUE_TABLE);
  const existing = rows.find((r) => r.항목ID === 항목ID && r.년월 === 년월);
  if (!값) {
    if (existing) await deleteKeyedRecord(BOARD_STAT_VALUE_TABLE, { 항목ID, 년월 });
    return;
  }
  await upsertKeyedRecord(BOARD_STAT_VALUE_TABLE, { 항목ID, 년월 }, {
    id: existing?.id || randomUUID(),
    항목ID, 년월, 값: String(값),
    작성자이메일: writerEmail, 작성자명: writerName,
    등록일시: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
}

// 전월누계: 같은 연도 안에서 조회월 이전 달들의 값을 합친 것 — 회계연도가 바뀌면(1월) 0부터 다시 쌓인다.
export function priorCumulative(values: BoardStatValue[], 항목ID: string, ym: string): number {
  const year = ym.slice(0, 4);
  return values
    .filter((v) => v.항목ID === 항목ID && v.년월.slice(0, 4) === year && v.년월 < ym)
    .reduce((a, v) => a + v.값, 0);
}

export function valueFor(values: BoardStatValue[], 항목ID: string, ym: string): number {
  const v = values.find((x) => x.항목ID === 항목ID && x.년월 === ym);
  return v ? v.값 : 0;
}
