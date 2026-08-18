import { randomUUID } from 'crypto';
import { deleteKeyedRecords, getKeyedList, upsertKeyedRecord, upsertKeyedRecords } from '@/lib/mutate/keyedTable';
import { BOARD_HEADCOUNT_TABLE, BOARD_HEADCOUNT_DATE_TABLE } from '@/lib/sheets/registry';

// 사업실적 "실인원 산출내역" — 그 달 안의 특정 기준일 하나 + 사업구분별 실인원 목록.
export type HeadcountRow = { id: string; 년월: string; 사업구분: string; 실인원: number; 비고: string; 정렬순서: number };
export type HeadcountRowInput = { id?: string; 사업구분: string; 실인원: number; 비고: string };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getHeadcountRows(ym: string): Promise<HeadcountRow[]> {
  const rows = await getKeyedList(BOARD_HEADCOUNT_TABLE);
  return rows
    .filter((r) => r.id && r.년월 === ym)
    .map((r) => ({ id: r.id, 년월: r.년월, 사업구분: r.사업구분, 실인원: num(r.실인원), 비고: r.비고, 정렬순서: num(r.정렬순서) }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function saveHeadcountRows(ym: string, rows: HeadcountRowInput[]): Promise<void> {
  const existing = await getHeadcountRows(ym);
  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  const toDelete = existing.filter((e) => !keepIds.has(e.id)).map((e) => ({ id: e.id }));
  if (toDelete.length > 0) await deleteKeyedRecords(BOARD_HEADCOUNT_TABLE, toDelete);

  const items = rows.map((r, i) => {
    const id = r.id || randomUUID();
    const record = { id, 년월: ym, 사업구분: r.사업구분, 실인원: String(r.실인원 || 0), 비고: r.비고, 정렬순서: String(i + 1) };
    return { keyValues: { id }, record };
  });
  if (items.length > 0) await upsertKeyedRecords(BOARD_HEADCOUNT_TABLE, items);
}

export async function getHeadcountDate(ym: string): Promise<string> {
  const rows = await getKeyedList(BOARD_HEADCOUNT_DATE_TABLE);
  return rows.find((r) => r.년월 === ym)?.기준일 ?? '';
}

export async function setHeadcountDate(ym: string, 기준일: string): Promise<void> {
  await upsertKeyedRecord(BOARD_HEADCOUNT_DATE_TABLE, { 년월: ym }, { 년월: ym, 기준일 });
}
