import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
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
};

export type BoardPlanRowInput = { id?: string; 사업명: string; 실시월일: string; 내용: string; 성과: string };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// 구분 컬럼이 생기기 전에 이미 쌓여있던 행은 전부 사업계획 카드였으므로, 값이 비어있으면 그걸로 간주한다.
function typeOf(v: string | undefined): BoardReportType {
  return v === '사업보고' ? '사업보고' : '사업계획';
}

export async function getBoardPlanEntries(구분: BoardReportType): Promise<BoardPlanEntry[]> {
  const rows = await getKeyedList(BOARD_PLAN_TABLE);
  return rows
    .filter((r) => r.id && typeOf(r.구분) === 구분)
    .map((r) => ({
      id: r.id,
      구분: typeOf(r.구분),
      사업명: r.사업명,
      실시월일: r.실시월일,
      내용: r.내용,
      성과: r.기대효과, // 시트 컬럼명은 기대효과 그대로 두고, 화면 라벨만 구분에 따라 성과/기대효과로 바꿔 보여준다
      정렬순서: num(r.정렬순서),
    }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

// 표를 스프레드시트처럼 편집(행 추가/삭제/수정)하다가 "저장" 한 번으로 전체를 반영한다 —
// 화면에서 넘어온 rows가 그 구분의 최종 상태이므로, 빠진 id는 삭제하고 나머지는 upsert한다.
export async function saveBoardReportSection(구분: BoardReportType, rows: BoardPlanRowInput[]): Promise<void> {
  const existing = await getBoardPlanEntries(구분);
  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  for (const e of existing) {
    if (!keepIds.has(e.id)) await deleteKeyedRecord(BOARD_PLAN_TABLE, { id: e.id });
  }

  let order = 1;
  for (const r of rows) {
    const id = r.id || randomUUID();
    const record = {
      id, 구분, 사업명: r.사업명, 실시월일: r.실시월일, 내용: r.내용,
      기대효과: r.성과, 정렬순서: String(order),
    };
    if (r.id) {
      await updateKeyedRecord(BOARD_PLAN_TABLE, { id }, record);
    } else {
      await addKeyedRecord(BOARD_PLAN_TABLE, record);
    }
    order++;
  }
}

export async function getReportPeriod(구분: BoardReportType): Promise<string> {
  const rows = await getKeyedList(BOARD_REPORT_PERIOD_TABLE);
  return rows.find((r) => r.구분 === 구분)?.기간텍스트 ?? '';
}

export async function setReportPeriod(구분: BoardReportType, 기간텍스트: string): Promise<void> {
  await upsertKeyedRecord(BOARD_REPORT_PERIOD_TABLE, { 구분 }, { 구분, 기간텍스트 });
}
