import { randomUUID } from 'crypto';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { appendRecord, deleteRecord, getAllRecords, updateRecord } from '@/lib/sheets/keyedTable';
import { VEHICLE_LOG_TABLE } from '@/lib/sheets/registry';
import { mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';
import {
  ApprovalPermissionError,
  applyApprovalAction,
  decorateApprovalInfo,
  resetApprovalOnResubmit,
} from '@/lib/approval/engine';
import { findTeamSupervisorEmail } from '@/lib/approval/teamSupervisor';
import { getStaffList } from '@/lib/mutate/staff';
import { getSystemSettings, VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC, VEHICLE_LOG_APPROVAL_MODE_MANUAL } from '@/lib/mutate/settings';
import { notifyJandiPersonal } from '@/lib/notify/jandi';
import { ADMIN_EMAILS, requireViewerEmail } from '@/lib/auth-helpers';

type DecoratedLog = Record<string, string>;
const STEPS = ['팀장', '차량관리자'];

async function resolveStepApproverEmail(step: string, record: Record<string, string>, staffList: Record<string, string>[]): Promise<string> {
  if (step === '차량관리자') return (await getSystemSettings()).vehicleManagerEmail;
  if (step === '팀장') return findTeamSupervisorEmail(record['소속팀'], staffList);
  return '';
}

async function isElectronic(): Promise<boolean> {
  return (await getSystemSettings()).vehicleLogApprovalMode === VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC;
}

async function decorate(record: Record<string, string>, staffList: Record<string, string>[], electronic: boolean): Promise<DecoratedLog> {
  if (!electronic) {
    return { ...record, 결재상태: '수기결재', 현재결재단계: '', 현재결재자이메일: '', 현재결재자명: '', 결재방식: VEHICLE_LOG_APPROVAL_MODE_MANUAL };
  }
  const normalized = { ...record, 결재상태: !record['결재상태'] || record['결재상태'] === '수기결재' ? '결재중' : record['결재상태'] };
  const staffNameByEmail = (email: string) => staffList.find((s) => s['이메일(아이디)'] === email)?.['성명'] ?? '';
  const approverCache = new Map<string, string>();
  for (const step of STEPS) {
    approverCache.set(step, await resolveStepApproverEmail(step, normalized, staffList));
  }
  const { 결재이력, ...decorated } = decorateApprovalInfo(normalized, STEPS, (step) => approverCache.get(step) ?? '', staffNameByEmail);
  void 결재이력;
  return { ...normalized, ...decorated, 결재방식: VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC };
}

export async function getVehicleLogList(): Promise<DecoratedLog[]> {
  const electronic = await isElectronic();
  const [list, staffList] = await Promise.all([
    getKeyedList(VEHICLE_LOG_TABLE),
    electronic ? getStaffList() : Promise.resolve([]),
  ]);
  const reversed = [...list].reverse();
  return Promise.all(reversed.map((r) => decorate(r, staffList, electronic)));
}

export async function getMyPendingVehicleLogApprovals(): Promise<DecoratedLog[]> {
  const electronic = await isElectronic();
  if (!electronic) return [];
  const viewerEmail = await requireViewerEmail();
  const all = await getVehicleLogList();
  if (ADMIN_EMAILS.includes(viewerEmail)) return all.filter((r) => r.결재상태 === '결재중');
  return all.filter((r) => r.현재결재자이메일 && r.현재결재자이메일.toLowerCase() === viewerEmail);
}

function buildSubmitMessage(record: DecoratedLog): string {
  return `[차량운행일지 제출] ${record.운전자명 ?? ''}님 - ${record.차량번호 ?? ''} · ${record.운행일자 ?? ''} · ${record.목적 ?? ''} - 결재 요청 (마이페이지 > 내 결재함에서 확인해주세요)`;
}

// appendRecord/updateRecord/deleteRecord는 시트에 직접 쓰고 끝나므로, 미러링 대상은
// (Supabase를 먼저 보는) getKeyedList가 아니라 시트에서 바로 다시 읽어야 한다 —
// 안 그러면 Supabase가 아직 못 따라간 예전 스냅샷을 그대로 다시 미러링해서, 방금 쓴
// 변경이 Supabase·화면엔 영영 반영되지 않는다.
async function afterWrite(): Promise<DecoratedLog[]> {
  const raw = await getAllRecords(VEHICLE_LOG_TABLE);
  await mirrorKeyedTableToSupabase({ tableName: VEHICLE_LOG_TABLE.sheetName, primaryKey: VEHICLE_LOG_TABLE.primaryKey }, raw);
  return getVehicleLogList();
}

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function addVehicleLog(payload: Record<string, string>): Promise<DecoratedLog[]> {
  if (!payload['차량번호'] || !payload['운행일자'] || !payload['목적']) {
    throw new Error('차량/운행일자/목적은 필수입니다.');
  }
  const electronic = await isElectronic();
  const id = randomUUID();
  const record: Record<string, string> = {};
  for (const h of VEHICLE_LOG_TABLE.headers) {
    if (h === 'id') { record[h] = id; continue; }
    if (h === '등록일시') { record[h] = nowTimestamp(); continue; }
    if (h === '결재상태') { record[h] = electronic ? '결재중' : '수기결재'; continue; }
    if (h === '결재이력JSON') { record[h] = '[]'; continue; }
    record[h] = payload[h] ?? '';
  }
  await appendRecord(VEHICLE_LOG_TABLE, record);
  if (electronic) {
    const staffList = await getStaffList();
    const decorated = await decorate(record, staffList, true);
    await notifyJandiPersonal(decorated.현재결재자이메일, staffList, buildSubmitMessage(decorated), (await getSystemSettings()).itemCheckReportJandiWebhook);
  }
  return afterWrite();
}

export async function updateVehicleLog(id: string, payload: Record<string, string>): Promise<DecoratedLog[]> {
  const existing = (await getKeyedList(VEHICLE_LOG_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('수정할 운행일지를 찾을 수 없습니다.');
  const electronic = await isElectronic();
  const wasRejected = electronic && existing['결재상태'] === '반려';
  const reset = wasRejected ? resetApprovalOnResubmit() : null;

  const record: Record<string, string> = {};
  for (const h of VEHICLE_LOG_TABLE.headers) {
    if (h === 'id') { record[h] = id; continue; }
    if (h === '등록일시') { record[h] = existing[h]; continue; }
    if (h === '결재상태') { record[h] = electronic ? (reset?.결재상태 ?? existing[h] ?? '결재중') : '수기결재'; continue; }
    if (h === '결재이력JSON') { record[h] = electronic ? (reset?.결재이력JSON ?? existing[h]) : '[]'; continue; }
    record[h] = payload[h] ?? '';
  }
  await updateRecord(VEHICLE_LOG_TABLE, { id }, record);

  if (wasRejected) {
    const staffList = await getStaffList();
    const decorated = await decorate(record, staffList, true);
    await notifyJandiPersonal(decorated.현재결재자이메일, staffList, buildSubmitMessage(decorated), (await getSystemSettings()).itemCheckReportJandiWebhook);
  }
  return afterWrite();
}

export async function deleteVehicleLog(id: string): Promise<DecoratedLog[]> {
  await deleteRecord(VEHICLE_LOG_TABLE, { id });
  return afterWrite();
}

function buildActionMessage(record: DecoratedLog, action: string, comment: string, actorName: string): string {
  const stageNote = record.결재상태 === '결재중' && record.현재결재단계 ? ` (다음 단계: ${record.현재결재단계} 결재 대기)` : '';
  return `[차량운행일지 ${action}] ${record.운전자명 ?? ''}님의 운행일지 - ${record.차량번호 ?? ''} · ${record.운행일자 ?? ''} - ${actorName}님이 ${action}함${stageNote}${comment ? ` (사유: ${comment})` : ''}`;
}

export async function actOnVehicleLog(id: string, action: '승인' | '반려', comment: string): Promise<DecoratedLog> {
  const electronic = await isElectronic();
  if (!electronic) throw new Error('현재 차량운행일지는 수기결재 모드입니다. 시스템 결재 처리를 할 수 없습니다.');

  const viewerEmail = await requireViewerEmail();
  const existing = (await getKeyedList(VEHICLE_LOG_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('처리할 운행일지를 찾을 수 없습니다.');

  const staffList = await getStaffList();
  const decorated = await decorate(existing, staffList, true);
  const isAdmin = ADMIN_EMAILS.includes(viewerEmail);
  const me = staffList.find((s) => s['이메일(아이디)'] === viewerEmail);

  let applied;
  try {
    applied = applyApprovalAction({
      record: existing,
      steps: STEPS,
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

  const record: Record<string, string> = { ...existing, 결재상태: applied.nextStatus, 결재이력JSON: applied.historyJson };
  await updateRecord(VEHICLE_LOG_TABLE, { id }, record);
  await mirrorKeyedTableToSupabase(
    { tableName: VEHICLE_LOG_TABLE.sheetName, primaryKey: VEHICLE_LOG_TABLE.primaryKey },
    await getAllRecords(VEHICLE_LOG_TABLE)
  );

  const redecorated = await decorate(record, staffList, true);
  await notifyJandiPersonal(redecorated.운전자이메일, staffList, buildActionMessage(redecorated, action, comment, me?.['성명'] ?? viewerEmail), (await getSystemSettings()).itemCheckReportJandiWebhook);
  return redecorated;
}
