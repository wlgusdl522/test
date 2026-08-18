import { randomUUID } from 'crypto';
import { deleteKeyedRecords, getKeyedList, upsertKeyedRecords, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_PLAN_TABLE, BOARD_REPORT_PERIOD_TABLE } from '@/lib/sheets/registry';

export type BoardReportType = '사업보고' | '사업계획';

export type BoardPlanEntry = {
  id: string;
  구분: BoardReportType;
  사업명: string;
  실시월일: string;
  내용: string;
  성과: string;
  정렬순서: number;
  요약포함: boolean;
};

export type BoardPlanRowInput = {
  id?: string; 사업명: string; 실시월일: string; 내용: string; 성과: string; 요약포함?: boolean;
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function todayYm(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 7);
}

// 구분/년월 컬럼이 생기기 전에 이미 쌓여있던 행은 전부 사업계획 카드였고 월조회도 없었으므로,
// 값이 비어있으면 각각 사업계획/조회 시점의 이번 달로 간주한다.
function typeOf(v: string | undefined): BoardReportType {
  return v === '사업보고' ? '사업보고' : '사업계획';
}

function ymOf(v: string | undefined): string {
  return v || todayYm();
}

export async function getBoardPlanEntries(구분: BoardReportType, ym: string): Promise<BoardPlanEntry[]> {
  const rows = await getKeyedList(BOARD_PLAN_TABLE);
  return rows
    .filter((r) => r.id && typeOf(r.구분) === 구분 && ymOf(r.년월) === ym)
    .map((r) => ({
      id: r.id,
      구분: typeOf(r.구분),
      사업명: r.사업명,
      실시월일: r.실시월일,
      내용: r.내용,
      성과: r.기대효과, // 시트 컬럼명은 기대효과 그대로 두고, 화면 라벨만 구분에 따라 성과/기대효과로 바꿔 보여준다
      정렬순서: num(r.정렬순서),
      요약포함: r.요약포함 === 'TRUE',
    }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

// "요약 업무보고"에 하이라이트로 넣기로 체크된 행만 — 년월 하나가 아니라 그 구분 전체에서
// 최근 항목을 훑어볼 수 있게 연도 단위로 넘겨받는다(호출부에서 필요한 만큼 필터링).
export async function getSummaryHighlights(구분: BoardReportType, ym: string): Promise<BoardPlanEntry[]> {
  const entries = await getBoardPlanEntries(구분, ym);
  return entries.filter((e) => e.요약포함);
}

// 표를 스프레드시트처럼 편집(행 추가/삭제/수정)하다가 "저장" 한 번으로 전체를 반영한다 —
// 화면에서 넘어온 rows가 그 구분+년월의 최종 상태이므로, 빠진 id는 삭제하고 나머지는 upsert한다.
// 행마다 add/update를 순차 호출하지 않고 삭제/upsert 각각 batch 한 번으로 묶는다(후원 저장 때
// 겪은 API 호출 급증 문제 재발 방지, boardDonation.ts saveDonationDetails와 동일한 패턴).
export async function saveBoardReportSection(구분: BoardReportType, ym: string, rows: BoardPlanRowInput[]): Promise<void> {
  const existing = await getBoardPlanEntries(구분, ym);
  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  const toDelete = existing.filter((e) => !keepIds.has(e.id)).map((e) => ({ id: e.id }));
  if (toDelete.length > 0) await deleteKeyedRecords(BOARD_PLAN_TABLE, toDelete);

  const items = rows.map((r, i) => {
    const id = r.id || randomUUID();
    const record = {
      id, 구분, 년월: ym, 사업명: r.사업명, 실시월일: r.실시월일, 내용: r.내용,
      기대효과: r.성과, 정렬순서: String(i + 1), 요약포함: r.요약포함 ? 'TRUE' : 'FALSE',
    };
    return { keyValues: { id }, record };
  });
  if (items.length > 0) await upsertKeyedRecords(BOARD_PLAN_TABLE, items);
}

export async function getReportPeriod(구분: BoardReportType, ym: string): Promise<string> {
  const rows = await getKeyedList(BOARD_REPORT_PERIOD_TABLE);
  return rows.find((r) => r.구분 === 구분 && r.년월 === ym)?.기간텍스트 ?? '';
}

export async function setReportPeriod(구분: BoardReportType, ym: string, 기간텍스트: string): Promise<void> {
  await upsertKeyedRecord(BOARD_REPORT_PERIOD_TABLE, { 구분, 년월: ym }, { 구분, 년월: ym, 기간텍스트 });
}
