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
import { findTeamSupervisorEmail } from '@/lib/approval/teamSupervisor';
import { getStaffList } from '@/lib/mutate/staff';
import { getSystemSettings } from '@/lib/mutate/settings';
import { notifyJandiPersonal } from '@/lib/notify/jandi';
import { isAdminEmail, requireViewerEmail } from '@/lib/auth-helpers';
import { recomputeCardLedgerStatus } from '@/lib/mutate/cardLedger';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function approvalSteps(record: Record<string, string>): string[] {
  return record['등록구분'] === '등록대상' ? ['과장', '물품관리자'] : ['과장'];
}

function resolveTeam(record: Record<string, string>, staffList: Record<string, string>[]): string {
  if (record['소속부서']) return record['소속부서'];
  const staff = staffList.find((s) => s['이메일(아이디)'] === record['검수자이메일']);
  return staff?.['소속팀'] ?? '';
}

async function resolveStepApproverEmail(step: string, record: Record<string, string>, staffList: Record<string, string>[]): Promise<string> {
  if (step === '물품관리자') return (await getSystemSettings()).itemCheckAssetManagerEmail;
  if (step === '과장') return findTeamSupervisorEmail(resolveTeam(record, staffList), staffList);
  return '';
}

// 결재이력(파싱된 배열)은 여기서는 안 실어 보낸다 — 필요하면 그때그때 결재이력JSON을 다시 파싱해서 쓴다
// (문자열 필드만 있는 시트 레코드에 배열 필드를 억지로 섞으면 타입이 지저분해진다).
type DecoratedReport = Record<string, string>;

async function decorate(record: Record<string, string>, staffList: Record<string, string>[]): Promise<DecoratedReport> {
  const staffNameByEmail = (email: string) => staffList.find((s) => s['이메일(아이디)'] === email)?.['성명'] ?? '';
  // resolveStepApproverEmail is async(설정 조회), 미리 계산해서 동기 콜백에 넘긴다.
  const steps = approvalSteps(record);
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

export async function addItemCheckReport(payload: Record<string, string>): Promise<DecoratedReport[]> {
  if (!payload['카드사용대장ID'] || !payload['품명'] || !payload['등록구분']) {
    throw new Error('카드사용대장 연결/품명/등록구분은 필수입니다.');
  }
  const id = randomUUID();
  const record: Record<string, string> = {};
  for (const h of ITEM_CHECK_REPORT_TABLE.headers) {
    if (h === 'id') { record[h] = id; continue; }
    if (h === '등록일시') { record[h] = nowTimestamp(); continue; }
    if (h === '비품등록번호' && payload['등록구분'] !== '등록대상') { record[h] = ''; continue; }
    if (h === '결재상태') { record[h] = '결재중'; continue; }
    if (h === '결재이력JSON') { record[h] = '[]'; continue; }
    if (h === '인쇄일시') { record[h] = ''; continue; }
    record[h] = payload[h] ?? '';
  }
  await appendRecord(ITEM_CHECK_REPORT_TABLE, record);
  const staffList = await getStaffList();
  const decorated = await decorate(record, staffList);
  const fallback = (await getSystemSettings()).itemCheckReportJandiWebhook;
  await notifyJandiPersonal(decorated.현재결재자이메일, staffList, buildSubmitMessage(decorated), fallback);
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
    if (h === '비품등록번호' && payload['등록구분'] !== '등록대상') { record[h] = ''; continue; }
    if (h === '결재상태') { record[h] = reset?.결재상태 ?? existing[h]; continue; }
    if (h === '결재이력JSON') { record[h] = reset?.결재이력JSON ?? existing[h]; continue; }
    if (h === '인쇄일시') { record[h] = existing[h]; continue; }
    record[h] = payload[h] ?? '';
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

export async function actOnItemCheckReport(id: string, action: '승인' | '반려', comment: string): Promise<DecoratedReport> {
  const viewerEmail = await requireViewerEmail();
  const existing = (await getKeyedList(ITEM_CHECK_REPORT_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('처리할 조서를 찾을 수 없습니다.');

  const staffList = await getStaffList();
  const decorated = await decorate(existing, staffList);
  const isAdmin = await isAdminEmail(viewerEmail);
  const me = staffList.find((s) => s['이메일(아이디)'] === viewerEmail);

  let applied;
  try {
    applied = applyApprovalAction({
      record: existing,
      steps: approvalSteps(existing),
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
