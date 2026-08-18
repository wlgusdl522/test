import { randomUUID } from 'crypto';
import {
  addKeyedRecord, deleteKeyedRecord, deleteKeyedRecords, getKeyedList, updateKeyedRecord, upsertKeyedRecords,
} from '@/lib/mutate/keyedTable';
import { BOARD_STAT_ITEM_TABLE, BOARD_STAT_VALUE_TABLE } from '@/lib/sheets/registry';

export type BoardStatModule = '회계' | '자원봉사자' | '후원';

// 회계/후원은 복지관/요양센터/데이케어센터가 서로 다른 값을 갖는다 — 자원봉사자만 시설 구분이 없다.
export const FACILITIES = ['복지관', '요양센터', '데이케어센터'] as const;
export type Facility = (typeof FACILITIES)[number];
export const NO_FACILITY = '전체';

// 참고 서식의 표기 그대로 — 내부 시설 코드(복지관/요양센터/데이케어센터)와 다른 정식 명칭.
// 후원/회계 등 이사회자료 화면 전체에서 공용으로 쓴다.
export const FACILITY_LABEL: Record<string, string> = {
  복지관: '복지관',
  요양센터: '병설 요양센터',
  데이케어센터: '병설 데이케어센터',
};

export function facilitiesFor(모듈: BoardStatModule): readonly string[] {
  return 모듈 === '자원봉사자' ? [NO_FACILITY] : FACILITIES;
}

export type BoardStatItem = { id: string; 모듈: string; 항목명: string; 정렬순서: number };
export type BoardStatValue = { 항목ID: string; 시설: string; 년월: string; 값: number };

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
  return rows
    .filter((r) => idSet.has(r.항목ID))
    .map((r) => ({ 항목ID: r.항목ID, 시설: r.시설 || NO_FACILITY, 년월: r.년월, 값: num(r.값) }));
}

// 값이 0/빈칸이면 굳이 시트에 빈 행을 남기지 않고 지운다 — 일일실적의 setDailyEntry와 동일한 동작.
// 행마다 upsert/delete를 순차 호출하면(매번 읽기+쓰기+Supabase미러링 반복) 항목이 많은 회계처럼
// 한 번에 수십 건을 저장할 때 API 호출이 항목 수만큼 늘어나 속도제한/타임아웃에 걸릴 수 있어
// (후원 저장 때 실제로 겪은 문제, boardDonation.ts saveDonationDetails 참고) 삭제/upsert를
// 각각 batch 한 번씩으로 묶는다.
export async function setModuleValues(
  entries: { 항목ID: string; 시설: string; 년월: string; 값: number }[],
  writerEmail: string,
  writerName: string
): Promise<void> {
  const rows = await getKeyedList(BOARD_STAT_VALUE_TABLE);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const toDelete: { 항목ID: string; 시설: string; 년월: string }[] = [];
  const toUpsert: { keyValues: Record<string, string>; record: Record<string, string> }[] = [];

  for (const e of entries) {
    const existing = rows.find((r) => r.항목ID === e.항목ID && r.시설 === e.시설 && r.년월 === e.년월);
    if (!e.값) {
      if (existing) toDelete.push({ 항목ID: e.항목ID, 시설: e.시설, 년월: e.년월 });
      continue;
    }
    toUpsert.push({
      keyValues: { 항목ID: e.항목ID, 시설: e.시설, 년월: e.년월 },
      record: {
        id: existing?.id || randomUUID(),
        항목ID: e.항목ID, 시설: e.시설, 년월: e.년월, 값: String(e.값),
        작성자이메일: writerEmail, 작성자명: writerName, 등록일시: now,
      },
    });
  }

  if (toDelete.length > 0) await deleteKeyedRecords(BOARD_STAT_VALUE_TABLE, toDelete);
  if (toUpsert.length > 0) await upsertKeyedRecords(BOARD_STAT_VALUE_TABLE, toUpsert);
}

// 전월누계: 같은 연도 안에서 조회월 이전 달들의 값을 합친 것 — 회계연도가 바뀌면(1월) 0부터 다시 쌓인다.
export function priorCumulative(values: BoardStatValue[], 항목ID: string, 시설: string, ym: string): number {
  const year = ym.slice(0, 4);
  return values
    .filter((v) => v.항목ID === 항목ID && v.시설 === 시설 && v.년월.slice(0, 4) === year && v.년월 < ym)
    .reduce((a, v) => a + v.값, 0);
}

export function valueFor(values: BoardStatValue[], 항목ID: string, 시설: string, ym: string): number {
  const v = values.find((x) => x.항목ID === 항목ID && x.시설 === 시설 && x.년월 === ym);
  return v ? v.값 : 0;
}
