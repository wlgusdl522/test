import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_ROSTER_GROUP_TABLE, BOARD_ROSTER_TABLE } from '@/lib/sheets/registry';

export type RosterPerson = { id: string; 항목ID: string; 년월: string; 구분: string; 이름: string; 정렬순서: number };
export type RosterRowInput = { id?: string; 항목ID: string; 구분: string; 이름: string };

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

// 전체 명단(여러 봉사분야가 한 표에 섞여 있음)을 통째로 편집하다가 "저장" 한 번으로 반영한다.
// rows가 이 년월의 최종 상태이므로, 빠진 id는 삭제하고 나머지는 upsert한다.
export async function saveRosterForYm(항목IDs: string[], ym: string, rows: RosterRowInput[]): Promise<void> {
  const existing = await getRosterByItems(항목IDs, ym);
  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  for (const e of existing) {
    if (!keepIds.has(e.id)) await deleteKeyedRecord(BOARD_ROSTER_TABLE, { id: e.id });
  }

  let order = 1;
  for (const r of rows) {
    const id = r.id || randomUUID();
    const record = { id, 항목ID: r.항목ID, 년월: ym, 구분: r.구분, 이름: r.이름, 정렬순서: String(order) };
    if (r.id) {
      await updateKeyedRecord(BOARD_ROSTER_TABLE, { id }, record);
    } else {
      await addKeyedRecord(BOARD_ROSTER_TABLE, record);
    }
    order++;
  }
}

export async function getRosterGroupLabel(ym: string): Promise<string> {
  const rows = await getKeyedList(BOARD_ROSTER_GROUP_TABLE);
  return rows.find((r) => r.년월 === ym)?.단체명 ?? '';
}

export async function setRosterGroupLabel(ym: string, 단체명: string): Promise<void> {
  await upsertKeyedRecord(BOARD_ROSTER_GROUP_TABLE, { 년월: ym }, { 년월: ym, 단체명 });
}

export type RosterSummaryRow = {
  id: string;
  항목명: string;
  단체이름: string[];
  일반이름: string[];
  단체: number;
  일반: number;
  소계: number;
};

// 참고 서식의 "구분(단체명 있음)"/"일반" 나누기 규칙을 편집화면(그리드)과 보기화면(총괄/분야별)이
// 똑같이 써야 해서 여기 한 곳에 모아둔다 — 구분값이 비어있으면 일반, 있으면 단체로 취급.
export function summarizeRoster(items: { id: string; 항목명: string }[], roster: RosterPerson[]): RosterSummaryRow[] {
  return items.map((i) => {
    const mine = roster.filter((r) => r.항목ID === i.id);
    const 단체이름 = mine.filter((r) => r.구분.trim()).map((r) => r.이름);
    const 일반이름 = mine.filter((r) => !r.구분.trim()).map((r) => r.이름);
    return { id: i.id, 항목명: i.항목명, 단체이름, 일반이름, 단체: 단체이름.length, 일반: 일반이름.length, 소계: mine.length };
  });
}
