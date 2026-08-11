import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord, upsertKeyedRecord, upsertKeyedRecords } from '@/lib/mutate/keyedTable';
import { WORKLOG_DAILY_TABLE, WORKLOG_MEMO_TABLE } from '@/lib/sheets/registry';

export type DailyEntry = { 항목ID: string; 날짜: string; 건: number; 명: number };
export type DailyMemo = { 사업명: string; 날짜: string; 활동내용: string; 특이사항: string };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getDailyEntries(사업명: string): Promise<DailyEntry[]> {
  const rows = await getKeyedList(WORKLOG_DAILY_TABLE);
  return rows
    .filter((r) => r.사업명 === 사업명)
    .map((r) => ({ 항목ID: r.항목ID, 날짜: r.날짜, 건: num(r.건), 명: num(r.명) }));
}

// 건/명 둘 다 0이면 굳이 시트에 빈 행을 남기지 않고 지운다 — 시안의 setV와 동일한 동작.
export async function setDailyEntry(
  사업명: string,
  항목ID: string,
  날짜: string,
  건: number,
  명: number,
  writerEmail: string,
  writerName: string
): Promise<void> {
  const rows = await getKeyedList(WORKLOG_DAILY_TABLE);
  const existing = rows.find((r) => r.항목ID === 항목ID && r.날짜 === 날짜);
  if (!건 && !명) {
    if (existing) await deleteKeyedRecord(WORKLOG_DAILY_TABLE, { 항목ID, 날짜 });
    return;
  }
  await upsertKeyedRecord(WORKLOG_DAILY_TABLE, { 항목ID, 날짜 }, {
    id: existing?.id || randomUUID(),
    사업명, 항목ID, 날짜, 건: String(건), 명: String(명),
    작성자이메일: writerEmail, 작성자명: writerName,
    등록일시: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
}

// 엑셀 가져오기용 — 건마다 setDailyEntry를 반복하면 매번 시트를 다시 읽어서 수백 건 단위
// 대량 가져오기 시 시간이 오래 걸리고 API 호출 한도에 걸릴 수 있다. 기존 값과 같은 항목은
// 걸러내고, 나머지만 upsertKeyedRecords로 한 번에 반영한다(0/0인 항목은 아예 건너뛴다 —
// 가져오기는 기존 값을 지우는 용도가 아니라 채워 넣는 용도이기 때문).
export async function bulkSetDailyEntries(
  사업명: string,
  entries: { 항목ID: string; 날짜: string; 건: number; 명: number }[],
  writerEmail: string,
  writerName: string
): Promise<number> {
  const existing = await getKeyedList(WORKLOG_DAILY_TABLE);
  const existingByKey = new Map(existing.map((r) => [`${r.항목ID}::${r.날짜}`, r]));
  const 등록일시 = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const items = entries
    .filter((e) => e.건 || e.명)
    .map((e) => {
      const found = existingByKey.get(`${e.항목ID}::${e.날짜}`);
      return {
        keyValues: { 항목ID: e.항목ID, 날짜: e.날짜 },
        record: {
          id: found?.id || randomUUID(),
          사업명, 항목ID: e.항목ID, 날짜: e.날짜, 건: String(e.건), 명: String(e.명),
          작성자이메일: writerEmail, 작성자명: writerName, 등록일시,
        },
      };
    });
  await upsertKeyedRecords(WORKLOG_DAILY_TABLE, items);
  return items.length;
}

export function dayValue(entries: DailyEntry[], itemId: string, date: string): [number, number] {
  const e = entries.find((r) => r.항목ID === itemId && r.날짜 === date);
  return e ? [e.건, e.명] : [0, 0];
}

// from~to(포함) 구간에서 여러 항목ID를 한꺼번에 합산 — 일계입력의 월계/누계, 월별현황의 월계/연계 계산에 공용으로 쓴다.
export function rangeSum(entries: DailyEntry[], itemIds: string[], from: string, to: string): [number, number] {
  let c = 0;
  let p = 0;
  const idSet = new Set(itemIds);
  entries.forEach((e) => {
    if (idSet.has(e.항목ID) && e.날짜 >= from && e.날짜 <= to) {
      c += e.건;
      p += e.명;
    }
  });
  return [c, p];
}

export async function getMemo(사업명: string, 날짜: string): Promise<DailyMemo | null> {
  const rows = await getKeyedList(WORKLOG_MEMO_TABLE);
  const row = rows.find((r) => r.사업명 === 사업명 && r.날짜 === 날짜);
  if (!row) return null;
  return { 사업명, 날짜, 활동내용: row.활동내용, 특이사항: row.특이사항 };
}

export async function getMemosForBusiness(사업명: string): Promise<DailyMemo[]> {
  const rows = await getKeyedList(WORKLOG_MEMO_TABLE);
  return rows.filter((r) => r.사업명 === 사업명).map((r) => ({ 사업명, 날짜: r.날짜, 활동내용: r.활동내용, 특이사항: r.특이사항 }));
}

export async function setMemo(
  사업명: string,
  날짜: string,
  활동내용: string,
  특이사항: string,
  writerEmail: string,
  writerName: string
): Promise<void> {
  const rows = await getKeyedList(WORKLOG_MEMO_TABLE);
  const existing = rows.find((r) => r.사업명 === 사업명 && r.날짜 === 날짜);
  if (!활동내용.trim() && !특이사항.trim()) {
    if (existing) await deleteKeyedRecord(WORKLOG_MEMO_TABLE, { 사업명, 날짜 });
    return;
  }
  await upsertKeyedRecord(WORKLOG_MEMO_TABLE, { 사업명, 날짜 }, {
    id: existing?.id || randomUUID(),
    사업명, 날짜, 활동내용, 특이사항,
    작성자이메일: writerEmail, 작성자명: writerName,
    등록일시: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
}

// 월별현황 달력의 "작성 완료" 표시용 — 그 날짜에 실적 행이나 메모 중 하나라도 있으면 작성된 것으로 본다.
export async function getWrittenDates(사업명: string): Promise<Set<string>> {
  const [entries, memos] = await Promise.all([getDailyEntries(사업명), getMemosForBusiness(사업명)]);
  const dates = new Set<string>();
  entries.forEach((e) => dates.add(e.날짜));
  memos.forEach((m) => dates.add(m.날짜));
  return dates;
}
