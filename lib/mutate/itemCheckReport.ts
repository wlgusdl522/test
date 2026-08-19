import { randomUUID } from 'crypto';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { appendRecord, deleteRecord, getAllRecords, updateRecord } from '@/lib/sheets/keyedTable';
import { ITEM_CHECK_REPORT_TABLE } from '@/lib/sheets/registry';
import { mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';
import {
  ApprovalPermissionError,
  applyApprovalAction,
  decorateApprovalInfo,
  resetApprovalOnResubmit,
} from '@/lib/approval/engine';
import { findStaffEmailByPosition, findTeamSupervisorEmail, resolveCardLedgerFirstApprovalStep } from '@/lib/approval/teamSupervisor';
import { getStaffList } from '@/lib/mutate/staff';
import { getSystemSettings } from '@/lib/mutate/settings';
import { notifyJandiPersonal } from '@/lib/notify/jandi';
import { isAdminEmail, requireViewerEmail } from '@/lib/auth-helpers';
import { recomputeCardLedgerStatus } from '@/lib/mutate/cardLedger';
import { parseAmount } from '@/lib/format';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export type ReportItem = {
  품목명: string;
  규격: string;
  단위: string;
  수량: string;
  단가: string;
  금액: string;
};

export function parseReportItems(json: string | undefined): ReportItem[] {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function sumReportItemsAmount(items: ReportItem[]): number {
  return items.reduce((sum, it) => sum + (parseAmount(it.금액) || 0), 0);
}

// 검수자(카드사용대장 담당자) 본인 직급에 따라 1단계 결재자가 달라지고(사원→과장, 과장→부장, 부장→관장,
// 관장은 결재 없음), 비품(등록대상) 건은 그 뒤에 물품출납원(비품등록번호 입력)·총무과장 승인이 이어 붙는다.
function approvalSteps(record: Record<string, string>, staffList: Record<string, string>[]): string[] {
  const requester = staffList.find((s) => s['이메일(아이디)'] === record['검수자이메일']);
  const firstStep = resolveCardLedgerFirstApprovalStep(requester?.['직급/직책'] ?? '');
  const steps = firstStep ? [firstStep] : [];
  if (record['등록구분'] === '등록대상') steps.push('물품출납원', '총무과장');
  return steps;
}

function resolveTeam(record: Record<string, string>, staffList: Record<string, string>[]): string {
  if (record['소속부서']) return record['소속부서'];
  const staff = staffList.find((s) => s['이메일(아이디)'] === record['검수자이메일']);
  return staff?.['소속팀'] ?? '';
}

async function resolveStepApproverEmail(step: string, record: Record<string, string>, staffList: Record<string, string>[]): Promise<string> {
  if (step === '물품출납원') return (await getSystemSettings()).itemCheckAssetManagerEmail;
  if (step === '총무과장') return (await getSystemSettings()).itemCheckGeneralAffairsManagerEmail;
  if (step === '과장') return findTeamSupervisorEmail(resolveTeam(record, staffList), staffList);
  return findStaffEmailByPosition(step, staffList); // '부장' 또는 '관장'
}

// 결재이력(파싱된 배열)은 여기서는 안 실어 보낸다 — 필요하면 그때그때 결재이력JSON을 다시 파싱해서 쓴다
// (문자열 필드만 있는 시트 레코드에 배열 필드를 억지로 섞으면 타입이 지저분해진다).
type DecoratedReport = Record<string, string>;

async function decorate(record: Record<string, string>, staffList: Record<string, string>[]): Promise<DecoratedReport> {
  const staffNameByEmail = (email: string) => staffList.find((s) => s['이메일(아이디)'] === email)?.['성명'] ?? '';
  // resolveStepApproverEmail is async(설정 조회), 미리 계산해서 동기 콜백에 넘긴다.
  const steps = approvalSteps(record, staffList);
  const approverCache = new Map<string, string>();
  for (const step of steps) {
    approverCache.set(step, await resolveStepApproverEmail(step, record, staffList));
  }
  const { 결재이력, ...decorated } = decorateApprovalInfo(record, steps, (step) => approverCache.get(step) ?? '', staffNameByEmail);
  void 결재이력;
  return { ...record, ...decorated };
}

export async function getItemCheckReportList(): Promise<DecoratedReport[]> {
  const [list, staffList] = await Promise.all([getKeyedList(ITEM_CHECK_REPORT_TABLE), getStaffList()]);
  const reversed = [...list].reverse();
  return Promise.all(reversed.map((r) => decorate(r, staffList)));
}

export async function getMyPendingItemCheckReportApprovals(): Promise<DecoratedReport[]> {
  const viewerEmail = await requireViewerEmail();
  const all = await getItemCheckReportList();
  if (await isAdminEmail(viewerEmail)) {
    return all.filter((r) => r.결재상태 === '결재중');
  }
  return all.filter((r) => r.현재결재자이메일 && r.현재결재자이메일.toLowerCase() === viewerEmail);
}

function buildSubmitMessage(decorated: DecoratedReport): string {
  return (
    `[물품검수조서 결재요청] ${decorated.품명 ?? ''} · ${Number(decorated.금액 ?? 0).toLocaleString()}원 · 검수자 ${decorated.검수자명 ?? ''}` +
    (decorated.현재결재단계 ? ` · ${decorated.현재결재단계} 결재 대기` : '') +
    '\n마이페이지 > 내 결재함에서 확인해주세요.'
  );
}

// appendRecord/updateRecord/deleteRecord는 시트에만 쓰므로, 미러링 대상은 Supabase를
// 먼저 보는 getKeyedList가 아니라 시트에서 바로 다시 읽어야 방금 쓴 변경이 반영된다.
async function afterWrite(): Promise<DecoratedReport[]> {
  const raw = await getAllRecords(ITEM_CHECK_REPORT_TABLE);
  await mirrorKeyedTableToSupabase(
    { tableName: ITEM_CHECK_REPORT_TABLE.sheetName, primaryKey: ITEM_CHECK_REPORT_TABLE.primaryKey },
    raw
  );
  return getItemCheckReportList();
}

// 여러 품목 입력 시 legacy 단일 필드(규격/단위/수량/단가/품목명/금액)를 대표값으로 채워서
// 이 필드들을 그대로 읽는 다른 화면(구 인쇄물 등)도 계속 동작하게 한다. 금액은 항상 전체 합계.
function applyReportItems(record: Record<string, string>): ReportItem[] {
  const items = parseReportItems(record['품목목록JSON']);
  if (items.length === 0) {
    record['품목목록JSON'] = '[]';
    return items;
  }
  const [first] = items;
  record['품목명'] = items.length > 1 ? `${first.품목명 ?? ''} 외 ${items.length - 1}건` : (first.품목명 ?? '');
  record['규격'] = first.규격 ?? '';
  record['단위'] = first.단위 ?? '';
  record['수량'] = first.수량 ?? '';
  record['단가'] = first.단가 ?? '';
  record['금액'] = String(sumReportItemsAmount(items));
  return items;
}

export async function addItemCheckReport(payload: Record<string, string>): Promise<DecoratedReport[]> {
  if (!payload['카드사용대장ID'] || !payload['품명'] || !payload['등록구분']) {
    throw new Error('카드사용대장 연결/품명/등록구분은 필수입니다.');
  }
  const id = randomUUID();
  const record: Record<string, string> = {};
  for (const h of ITEM_CHECK_REPORT_TABLE.headers) {
    if (h === 'id') { record[h] = id; continue; }
    if (h === '등록일시') { record[h] = nowTimestamp(); continue; }
    // 비품등록번호는 작성자가 아니라 물품출납원 결재 단계에서 입력한다 — 새로 작성할 땐 항상 비워둔다.
    if (h === '비품등록번호') { record[h] = ''; continue; }
    if (h === '결재상태') { record[h] = ''; continue; } // steps 계산 후 채운다
    if (h === '결재이력JSON') { record[h] = '[]'; continue; }
    if (h === '인쇄일시') { record[h] = ''; continue; }
    record[h] = payload[h] ?? '';
  }
  if (applyReportItems(record).length === 0) {
    throw new Error('검수 품목을 1개 이상 입력해주세요.');
  }

  const staffList = await getStaffList();
  const steps = approvalSteps(record, staffList);
  // 결재라인이 아예 없는 경우(관장 본인 작성 + 비품 아님)는 결재 없이 바로 완료 처리한다.
  record['결재상태'] = steps.length > 0 ? '결재중' : '승인';

  await appendRecord(ITEM_CHECK_REPORT_TABLE, record);
  if (steps.length > 0) {
    const decorated = await decorate(record, staffList);
    const fallback = (await getSystemSettings()).itemCheckReportJandiWebhook;
    await notifyJandiPersonal(decorated.현재결재자이메일, staffList, buildSubmitMessage(decorated), fallback);
  }
  const result = await afterWrite();
  await recomputeCardLedgerStatus(record['카드사용대장ID']);
  return result;
}

export async function updateItemCheckReport(id: string, payload: Record<string, string>): Promise<DecoratedReport[]> {
  const existing = (await getKeyedList(ITEM_CHECK_REPORT_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('수정할 조서를 찾을 수 없습니다.');
  const wasRejected = existing['결재상태'] === '반려';
  const reset = wasRejected ? resetApprovalOnResubmit() : null;

  const record: Record<string, string> = {};
  for (const h of ITEM_CHECK_REPORT_TABLE.headers) {
    if (h === 'id') { record[h] = id; continue; }
    if (h === '등록일시') { record[h] = existing[h]; continue; }
    // 이미 물품출납원이 입력해둔 비품등록번호는 다른 필드를 고치는 수정으로 지워지지 않게 그대로 들고 간다.
    if (h === '비품등록번호') { record[h] = existing[h] ?? ''; continue; }
    if (h === '결재상태') { record[h] = reset?.결재상태 ?? existing[h]; continue; }
    if (h === '결재이력JSON') { record[h] = reset?.결재이력JSON ?? existing[h]; continue; }
    if (h === '인쇄일시') { record[h] = existing[h]; continue; }
    record[h] = payload[h] ?? '';
  }
  if (applyReportItems(record).length === 0) {
    throw new Error('검수 품목을 1개 이상 입력해주세요.');
  }
  await updateRecord(ITEM_CHECK_REPORT_TABLE, { id }, record);

  if (wasRejected) {
    const staffList = await getStaffList();
    const decorated = await decorate(record, staffList);
    const fallback = (await getSystemSettings()).itemCheckReportJandiWebhook;
    await notifyJandiPersonal(decorated.현재결재자이메일, staffList, buildSubmitMessage(decorated), fallback);
  }
  return afterWrite();
}

export async function deleteItemCheckReport(id: string): Promise<DecoratedReport[]> {
  const existing = (await getKeyedList(ITEM_CHECK_REPORT_TABLE)).find((r) => r.id === id);
  await deleteRecord(ITEM_CHECK_REPORT_TABLE, { id });
  const result = await afterWrite();
  if (existing) await recomputeCardLedgerStatus(existing['카드사용대장ID']);
  return result;
}

function buildActionMessage(decorated: DecoratedReport, action: string, comment: string, actorName: string): string {
  const stageNote = decorated.결재상태 === '결재중' && decorated.현재결재단계 ? ` (다음 단계: ${decorated.현재결재단계} 결재 대기)` : '';
  const summary = `${decorated.품명 ?? ''} · ${Number(decorated.금액 ?? 0).toLocaleString()}원`;
  return `[물품검수조서 ${action}] ${decorated.검수자명 ?? ''}님의 조서 - ${summary} - ${actorName}님이 ${action}함${stageNote}${comment ? ` (사유: ${comment})` : ''}`;
}

export async function actOnItemCheckReport(id: string, action: '승인' | '반려', comment: string, assetNo = ''): Promise<DecoratedReport> {
  const viewerEmail = await requireViewerEmail();
  const existing = (await getKeyedList(ITEM_CHECK_REPORT_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('처리할 조서를 찾을 수 없습니다.');

  const staffList = await getStaffList();
  const decorated = await decorate(existing, staffList);
  const isAdmin = await isAdminEmail(viewerEmail);
  const me = staffList.find((s) => s['이메일(아이디)'] === viewerEmail);

  // 물품출납원 단계 승인은 비품등록번호 입력이 짝을 이룬다 — 번호 없이는 승인할 수 없다.
  if (action === '승인' && decorated.현재결재단계 === '물품출납원' && !assetNo.trim()) {
    throw new Error('비품등록번호를 입력해주세요.');
  }

  let applied;
  try {
    applied = applyApprovalAction({
      record: existing,
      steps: approvalSteps(existing, staffList),
      action,
      actorEmail: viewerEmail,
      actorName: me?.['성명'] ?? viewerEmail,
      comment,
      isAdmin,
      currentApproverEmail: decorated.현재결재자이메일,
    });
  } catch (err) {
    if (err instanceof ApprovalPermissionError) throw new Error(err.message);
    throw err;
  }

  const record: Record<string, string> = {
    ...existing,
    결재상태: applied.nextStatus,
    결재이력JSON: applied.historyJson,
  };
  if (action === '승인' && decorated.현재결재단계 === '물품출납원') {
    record['비품등록번호'] = assetNo.trim();
  }
  await updateRecord(ITEM_CHECK_REPORT_TABLE, { id }, record);
  await mirrorKeyedTableToSupabase(
    { tableName: ITEM_CHECK_REPORT_TABLE.sheetName, primaryKey: ITEM_CHECK_REPORT_TABLE.primaryKey },
    await getAllRecords(ITEM_CHECK_REPORT_TABLE)
  );

  const redecorated = await decorate(record, staffList);
  const fallback = (await getSystemSettings()).itemCheckReportJandiWebhook;
  await notifyJandiPersonal(
    redecorated.검수자이메일,
    staffList,
    buildActionMessage(redecorated, action, comment, me?.['성명'] ?? viewerEmail),
    fallback
  );
  return redecorated;
}

export async function setItemCheckReportPrinted(id: string, printed: boolean): Promise<void> {
  const existing = (await getKeyedList(ITEM_CHECK_REPORT_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('조서를 찾을 수 없습니다.');
  const value = printed ? nowTimestamp() : '';
  await updateRecord(ITEM_CHECK_REPORT_TABLE, { id }, { ...existing, 인쇄일시: value });
  await mirrorKeyedTableToSupabase(
    { tableName: ITEM_CHECK_REPORT_TABLE.sheetName, primaryKey: ITEM_CHECK_REPORT_TABLE.primaryKey },
    await getAllRecords(ITEM_CHECK_REPORT_TABLE)
  );
}
