import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from './server';
import { ApprovalPermissionError, applyApprovalAction, decorateApprovalInfo } from '@/lib/approval/engine';
import { getStaffList } from '@/lib/mutate/staff';
import { getSystemSettings } from '@/lib/mutate/settings';
import { nextCertificateNumber } from '@/lib/mutate/certNumbering';
import { isAdminEmail, requireViewerEmail } from '@/lib/auth-helpers';

// 증명서(재직/경력/원천징수/기타) + 상장 발급대장 — 시트 없이 Supabase가 원본(당직/부재중현황과 동일한 예외 패턴).
// 구분='증명서'는 전자결재(결재상태/결재이력JSON) 대상, 구분='상장'은 결재 없이 즉시 확정된다.
// 채번 시퀀스는 lib/mutate/certNumbering.ts(getSetting/setSetting 기반)를 공유한다.

export const CERTIFICATE_TYPES = ['재직증명서', '경력증명서', '원천징수영수증', '기타'] as const;

const HEADERS = [
  'id', '문서번호', '구분', '종류', '대상자성명', '대상자소속', '대상자직위',
  '근무기간', '용도', '등록자이메일', '등록자명', '등록일시',
  '결재상태', '결재이력JSON', '발급일', '비고',
];

function table() {
  return getSupabaseServerClient().from('증명서발급대장') as any;
}

function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) out[k] = v === null || v === undefined ? '' : String(v);
  return out;
}

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getAllCertificates(): Promise<Record<string, string>[]> {
  const { data, error } = await table().select('*').order('등록일시', { ascending: false });
  if (error) throw new Error(`증명서발급대장 조회 실패: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeRow);
}

export async function getCertificateById(id: string): Promise<Record<string, string> | null> {
  const { data, error } = await table().select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

const STEPS = ['최종승인'];

async function resolveStepApproverEmail(step: string): Promise<string> {
  if (step === '최종승인') return (await getSystemSettings()).certificateApproverEmail;
  return '';
}

type DecoratedCertificate = Record<string, string>;

async function decorate(record: Record<string, string>, staffList: Record<string, string>[]): Promise<DecoratedCertificate> {
  const staffNameByEmail = (email: string) => staffList.find((s) => s['이메일(아이디)'] === email)?.['성명'] ?? '';
  const approverCache = new Map<string, string>();
  for (const step of STEPS) {
    approverCache.set(step, await resolveStepApproverEmail(step));
  }
  const { 결재이력, ...decorated } = decorateApprovalInfo(record, STEPS, (step) => approverCache.get(step) ?? '', staffNameByEmail);
  void 결재이력;
  return { ...record, ...decorated };
}

export async function getCertificateList(): Promise<DecoratedCertificate[]> {
  const [list, staffList] = await Promise.all([getAllCertificates(), getStaffList()]);
  return Promise.all(list.map((r) => decorate(r, staffList)));
}

export async function getMyPendingCertificateApprovals(): Promise<DecoratedCertificate[]> {
  const viewerEmail = await requireViewerEmail();
  const all = await getCertificateList();
  const pending = all.filter((r) => r.구분 === '증명서' && r.결재상태 === '결재중');
  if (await isAdminEmail(viewerEmail)) return pending;
  return pending.filter((r) => r.현재결재자이메일 && r.현재결재자이메일.toLowerCase() === viewerEmail);
}

export async function addCertificate(payload: Record<string, string>): Promise<DecoratedCertificate[]> {
  if (!payload['대상자성명'] || !payload['종류']) {
    throw new Error('대상자성명과 종류는 필수입니다.');
  }
  const viewerEmail = await requireViewerEmail();
  const staffList = await getStaffList();
  const me = staffList.find((s) => s['이메일(아이디)'] === viewerEmail);

  const record: Record<string, string> = {};
  for (const h of HEADERS) {
    if (h === 'id') { record[h] = randomUUID(); continue; }
    if (h === '구분') { record[h] = '증명서'; continue; }
    if (h === '문서번호') { record[h] = ''; continue; }
    if (h === '등록자이메일') { record[h] = viewerEmail; continue; }
    if (h === '등록자명') { record[h] = me?.['성명'] ?? viewerEmail; continue; }
    if (h === '등록일시') { record[h] = nowTimestamp(); continue; }
    if (h === '결재상태') { record[h] = '결재중'; continue; }
    if (h === '결재이력JSON') { record[h] = '[]'; continue; }
    if (h === '발급일') { record[h] = ''; continue; }
    record[h] = payload[h] ?? '';
  }
  const { error } = await table().insert(record);
  if (error) throw new Error(`증명서 신청 등록 실패: ${error.message}`);
  return getCertificateList();
}

export async function addAward(payload: Record<string, string>): Promise<DecoratedCertificate[]> {
  if (!payload['대상자성명'] || !payload['용도']) {
    throw new Error('대상자성명과 사유(사업명)는 필수입니다.');
  }
  const viewerEmail = await requireViewerEmail();
  const staffList = await getStaffList();
  const me = staffList.find((s) => s['이메일(아이디)'] === viewerEmail);
  const docNumber = await nextCertificateNumber();

  const record: Record<string, string> = {};
  for (const h of HEADERS) {
    if (h === 'id') { record[h] = randomUUID(); continue; }
    if (h === '문서번호') { record[h] = docNumber; continue; }
    if (h === '구분') { record[h] = '상장'; continue; }
    if (h === '종류') { record[h] = ''; continue; }
    if (h === '등록자이메일') { record[h] = viewerEmail; continue; }
    if (h === '등록자명') { record[h] = me?.['성명'] ?? viewerEmail; continue; }
    if (h === '등록일시') { record[h] = nowTimestamp(); continue; }
    if (h === '결재상태') { record[h] = '승인'; continue; }
    if (h === '결재이력JSON') { record[h] = '[]'; continue; }
    if (h === '발급일') { record[h] = payload['발급일'] || todayISO(); continue; }
    record[h] = payload[h] ?? '';
  }
  const { error } = await table().insert(record);
  if (error) throw new Error(`상장 등록 실패: ${error.message}`);
  return getCertificateList();
}

export async function actOnCertificate(id: string, action: '승인' | '반려', comment: string): Promise<DecoratedCertificate> {
  const viewerEmail = await requireViewerEmail();
  const existing = await getCertificateById(id);
  if (!existing) throw new Error('처리할 증명서 신청을 찾을 수 없습니다.');

  const staffList = await getStaffList();
  const decorated = await decorate(existing, staffList);
  const admin = await isAdminEmail(viewerEmail);
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
      isAdmin: admin,
      currentApproverEmail: decorated.현재결재자이메일,
    });
  } catch (err) {
    if (err instanceof ApprovalPermissionError) throw new Error(err.message);
    throw err;
  }

  const patch: Record<string, string> = { 결재상태: applied.nextStatus, 결재이력JSON: applied.historyJson };
  if (applied.nextStatus === '승인') {
    patch['문서번호'] = await nextCertificateNumber();
    patch['발급일'] = todayISO();
  }
  const { error } = await table().update(patch).eq('id', id);
  if (error) throw new Error(`증명서 처리 실패: ${error.message}`);

  return decorate({ ...existing, ...patch }, staffList);
}
