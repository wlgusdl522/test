import { randomUUID } from 'crypto';
import { deleteKeyedRecord, deleteKeyedRecords, getKeyedList, addKeyedRecord, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { GENERAL_LOG_CONTENT_TABLE, GENERAL_LOG_DAILY_TABLE } from '@/lib/sheets/registry';
import { getGeneralLogItems, type GeneralLogItem } from '@/lib/mutate/generalLogItem';

const NOTE_KIND = '특이사항';
const WORK_KIND = '업무';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export type GeneralLogRollupRow = GeneralLogItem & {
  일계건: number; 일계명: number;
  월계건: number; 월계명: number;
  누계건: number; 누계명: number;
  달성율건: number; 달성율명: number;
};

function sum(rows: Record<string, string>[], col: '건' | '명'): number {
  return rows.reduce((acc, r) => acc + Number(r[col] || 0), 0);
}

function rate(actual: number, target: number): number {
  return target > 0 ? Math.round((actual / target) * 1000) / 10 : 0;
}

// 일계=선택한 날짜, 월계=선택한 날짜가 속한 달의 1일부터 그 날짜까지 누적, 누계=선택한 날짜가
// 속한 해의 1월 1일부터 그 날짜까지 누적 — 사회복지관 실적보고 관례상 "해당 시점까지의 누적치".
export async function getGeneralLogRollup(businessName: string, date: string): Promise<GeneralLogRollupRow[]> {
  const [items, dailyRows] = await Promise.all([
    getGeneralLogItems(businessName),
    getKeyedList(GENERAL_LOG_DAILY_TABLE),
  ]);
  const rowsForBusiness = dailyRows.filter((r) => r['사업명'] === businessName && r['날짜'] <= date);
  const yearMonth = date.slice(0, 7);
  const year = date.slice(0, 4);

  return items.map((item) => {
    const forItem = rowsForBusiness.filter((r) => r['항목ID'] === item.id);
    const dayRows = forItem.filter((r) => r['날짜'] === date);
    const monthRows = forItem.filter((r) => r['날짜'].startsWith(yearMonth));
    const yearRows = forItem.filter((r) => r['날짜'].startsWith(year));

    const 목표건 = Number(item.목표건 || 0);
    const 목표명 = Number(item.목표명 || 0);
    const 누계건 = sum(yearRows, '건');
    const 누계명 = sum(yearRows, '명');

    return {
      ...item,
      일계건: sum(dayRows, '건'),
      일계명: sum(dayRows, '명'),
      월계건: sum(monthRows, '건'),
      월계명: sum(monthRows, '명'),
      누계건,
      누계명,
      달성율건: rate(누계건, 목표건),
      달성율명: rate(누계명, 목표명),
    };
  });
}

export async function saveGeneralLogDaily(
  businessName: string,
  date: string,
  entries: { 항목ID: string; 건: string; 명: string }[],
  viewerEmail: string,
  viewerName: string
): Promise<void> {
  for (const entry of entries) {
    const keyValues = { 사업명: businessName, 날짜: date, 항목ID: entry.항목ID };
    const hasValue = entry.건.trim() !== '' || entry.명.trim() !== '';
    if (!hasValue) {
      await deleteKeyedRecord(GENERAL_LOG_DAILY_TABLE, keyValues).catch(() => {
        // 애초에 저장된 적 없는 항목을 비워서 제출한 경우 — 지울 대상이 없으니 조용히 넘어간다.
      });
      continue;
    }
    await upsertKeyedRecord(GENERAL_LOG_DAILY_TABLE, keyValues, {
      ...keyValues,
      건: entry.건,
      명: entry.명,
      작성자이메일: viewerEmail,
      작성자명: viewerName,
      등록일시: nowTimestamp(),
    });
  }
}

export type GeneralLogContentRow = { id: string; 업무내용: string; 실적: string; 비고: string };

export async function getGeneralLogContent(businessName: string, date: string): Promise<GeneralLogContentRow[]> {
  const all = await getKeyedList(GENERAL_LOG_CONTENT_TABLE);
  return all
    .filter((r) => r['사업명'] === businessName && r['날짜'] === date && r['구분'] !== NOTE_KIND)
    .map((r) => ({ id: r.id, 업무내용: r['내용'] ?? '', 실적: r['실적'] ?? '', 비고: r['비고'] ?? '' }));
}

export async function getGeneralLogNote(businessName: string, date: string): Promise<string> {
  const all = await getKeyedList(GENERAL_LOG_CONTENT_TABLE);
  return all.find((r) => r['사업명'] === businessName && r['날짜'] === date && r['구분'] === NOTE_KIND)?.['내용'] ?? '';
}

// 화면에서 그날 업무내용 행+특이사항 전체를 다시 보내주므로, 기존 행을 모두 지우고 새로 넣는
// 전체 교체 방식을 쓴다 — 특이사항은 하루 한 줄뿐이라 별도 탭 없이 '구분'='특이사항' 행 하나로 같이 담는다.
export async function submitGeneralLogContentDay(
  businessName: string,
  date: string,
  rows: { 업무내용: string; 실적: string; 비고: string }[],
  note: string,
  viewerEmail: string,
  viewerName: string
): Promise<void> {
  const all = await getKeyedList(GENERAL_LOG_CONTENT_TABLE);
  const existing = all.filter((r) => r['사업명'] === businessName && r['날짜'] === date);
  if (existing.length > 0) {
    await deleteKeyedRecords(GENERAL_LOG_CONTENT_TABLE, existing.map((r) => ({ id: r.id })));
  }

  const now = nowTimestamp();
  for (const row of rows) {
    if (!row.업무내용.trim()) continue;
    await addKeyedRecord(GENERAL_LOG_CONTENT_TABLE, {
      id: randomUUID(),
      사업명: businessName,
      날짜: date,
      구분: WORK_KIND,
      내용: row.업무내용,
      실적: row.실적,
      비고: row.비고,
      작성자이메일: viewerEmail,
      작성자명: viewerName,
      등록일시: now,
    });
  }
  if (note.trim()) {
    await addKeyedRecord(GENERAL_LOG_CONTENT_TABLE, {
      id: randomUUID(),
      사업명: businessName,
      날짜: date,
      구분: NOTE_KIND,
      내용: note,
      실적: '',
      비고: '',
      작성자이메일: viewerEmail,
      작성자명: viewerName,
      등록일시: now,
    });
  }
}
