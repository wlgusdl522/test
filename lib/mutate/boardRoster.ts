import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_ROSTER_TABLE } from '@/lib/sheets/registry';

export type RosterPerson = { id: string; 항목ID: string; 년월: string; 구분: string; 이름: string; 정렬순서: number };
export type RosterRowInput = { id?: string; 구분: string; 이름: string };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getRosterByItems(항목IDs: string[], ym: string): Promise<RosterPerson[]> {
  const rows = await getKeyedList(BOARD_ROSTER_TABLE);
  const idSet = new Set(항목IDs);
  return rows
    .filter((r) => r.id && idSet.has(r.항목ID) && r.년월 === ym)
    .map((r) => ({ id: r.id, 항목ID: r.항목ID, 년월: r.년월, 구분: r.구분, 이름: r.이름, 정렬순서: num(r.정렬순서) }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

// 명단도 업무보고 표처럼 통째로 편집하다가 "저장" 한 번으로 반영한다 — 화면에서 넘어온 rows가
// 그 항목+년월의 최종 상태이므로, 빠진 id는 삭제하고 나머지는 upsert한다.
export async function saveRosterForItem(항목ID: string, ym: string, rows: RosterRowInput[]): Promise<void> {
  const existing = await getRosterByItems([항목ID], ym);
  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  for (const e of existing) {
    if (!keepIds.has(e.id)) await deleteKeyedRecord(BOARD_ROSTER_TABLE, { id: e.id });
  }

  let order = 1;
  for (const r of rows) {
    const id = r.id || randomUUID();
    const record = { id, 항목ID, 년월: ym, 구분: r.구분, 이름: r.이름, 정렬순서: String(order) };
    if (r.id) {
      await updateKeyedRecord(BOARD_ROSTER_TABLE, { id }, record);
    } else {
      await addKeyedRecord(BOARD_ROSTER_TABLE, record);
    }
    order++;
  }
}
