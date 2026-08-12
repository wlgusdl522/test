import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { getSupabaseServerClient } from './server';
import { ApprovalPermissionError, applyApprovalAction, decorateApprovalInfo } from '@/lib/approval/engine';
import { findStaffEmailByPosition, findTeamSupervisorEmail } from '@/lib/approval/teamSupervisor';
import { getStaffList } from '@/lib/mutate/staff';
import { getSystemSettings } from '@/lib/mutate/settings';
import { nextCertificateNumber } from '@/lib/mutate/certNumbering';
import { requireCanViewCertificateLog, isAdminEmail, requireViewerEmail } from '@/lib/auth-helpers';
import { appendLedgerRow } from '@/lib/sheets/ledger';
import { CERTIFICATE_LEDGER_SHEET_ID } from '@/lib/sheets/sheetIds';
import { renderCertificatePdf } from '@/lib/pdf/certificatePdf';
import { uploadCertificatePdf } from '@/lib/drive/certificateFolder';
import { buildCertificateEmail, sendMail } from '@/lib/mail/certificateMail';

// 증명서(재직/경력/원천징수/기타) + 상장 발급대장 — 시트 없이 Supabase가 원본(당직/부재중현황과 동일한 예외 패턴).
// 구분='증명서'는 전자결재(결재상태/결재이력JSON) 대상, 구분='상장'은 결재 없이 즉시 확정된다.
// 채번 시퀀스는 lib/mutate/certNumbering.ts(getSetting/setSetting 기반)를 공유한다.

export const CERTIFICATE_TYPES = ['재직증명서', '경력증명서', '원천징수영수증', '기타'] as const;

const HEADERS = [
  'id', '문서번호', '구분', '종류', '대상자성명', '대상자소속', '대상자직위', '대상자이메일',
  '근무기간', '용도', '등록자이메일', '등록자명', '등록일시',
  '결재상태', '결재이력JSON', '발급일', '발행일시', '문서URL', '비고',
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

// 증명서·상장 발급대장(구글시트)에 append — 결재 최종승인/즉시확정된 건만, 반려된 신청은 올라가지 않는다.
// 대장 append 실패로 승인 처리 자체가 실패하면 안 되므로(원본은 Supabase, 대장은 감사용 사본) 에러를 삼키고 로그만 남긴다.
async function appendCertificateToLedger(record: Record<string, string>): Promise<void> {
  try {
    await appendLedgerRow(CERTIFICATE_LEDGER_SHEET_ID, [
      record['문서번호'] || '',
      record['구분'] || '',
      record['종류'] || '',
      record['대상자성명'] || '',
      record['대상자소속'] || '',
      record['대상자직위'] || '',
      record['용도'] || '',
      record['발급일'] || '',
      record['등록자명'] || '',
    ]);
  } catch (error) {
    console.error('[증명서·상장 발급대장 append 실패]', error);
  }
}

// 서무/회계(기안자 본인 확인) → 총무과 과장 → 부장 → 관장, 4단계 결재.
const STEPS = ['서무/회계', '총무과 과장', '부장', '관장'];

async function resolveStepApproverEmail(step: string, staffList: Record<string, string>[]): Promise<string> {
  if (step === '서무/회계') return (await getSystemSettings()).certificateClerkEmail;
  if (step === '총무과 과장') return findTeamSupervisorEmail('총무팀', staffList);
  if (step === '부장') return findStaffEmailByPosition('부장', staffList);
  if (step === '관장') return findStaffEmailByPosition('관장', staffList) || (await getSystemSettings()).certificateApproverEmail;
  return '';
}

type DecoratedCertificate = Record<string, string>;

async function decorate(record: Record<string, string>, staffList: Record<string, string>[]): Promise<DecoratedCertificate> {
  const staffNameByEmail = (email: string) => staffList.find((s) => s['이메일(아이디)'] === email)?.['성명'] ?? '';
  const approverCache = new Map<string, string>();
  for (const step of STEPS) {
    approverCache.set(step, await resolveStepApproverEmail(step, staffList));
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
  await appendCertificateToLedger(record);
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

  // 관장 최종승인이 나도 여기서는 문서번호를 채번하지 않는다 — 채번/직인/PDF저장/메일발송은
  // 서무·회계가 "발행" 버튼을 눌러야 진행되는 별도 단계(issueCertificate)다.
  const patch: Record<string, string> = { 결재상태: applied.nextStatus, 결재이력JSON: applied.historyJson };
  const { error } = await table().update(patch).eq('id', id);
  if (error) throw new Error(`증명서 처리 실패: ${error.message}`);

  return decorate({ ...existing, ...patch }, staffList);
}

// 관장 최종승인 후 서무/회계가 누르는 "발행" — 문서번호 채번 + 발급일 확정 + 대장(시트) 기록.
// PDF 생성/직인 스탬프/Drive 저장/수령인 메일 발송은 아래 issueCertificate()에서 이어서 처리한다.
async function markCertificateIssued(id: string): Promise<Record<string, string>> {
  const existing = await getCertificateById(id);
  if (!existing) throw new Error('발행할 증명서를 찾을 수 없습니다.');
  if (existing['구분'] !== '증명서' || existing['결재상태'] !== '승인') {
    throw new Error('관장 최종승인이 완료된 증명서만 발행할 수 있습니다.');
  }
  if (existing['발행일시']) {
    throw new Error('이미 발행된 문서입니다.');
  }

  const patch: Record<string, string> = {
    문서번호: await nextCertificateNumber(),
    발급일: todayISO(),
    발행일시: nowTimestamp(),
  };
  const { error } = await table().update(patch).eq('id', id);
  if (error) throw new Error(`증명서 발행 처리 실패: ${error.message}`);

  const finalRecord = { ...existing, ...patch };
  await appendCertificateToLedger(finalRecord);
  return finalRecord;
}

async function setCertificateDocumentUrl(id: string, url: string): Promise<void> {
  const { error } = await table().update({ 문서URL: url }).eq('id', id);
  if (error) throw new Error(`증명서 문서URL 저장 실패: ${error.message}`);
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export type IssueCertificateResult = {
  record: DecoratedCertificate;
  documentUrl: string;
  emailSent: boolean;
  warnings: string[];
};

// "발행" 버튼 하나로 이어지는 전체 처리: 채번/대장기록 → PDF 생성(직인·QR 포함) → Drive 연도별 폴더 저장
// → 대상자에게 메일 발송. PDF·메일 단계는 실패해도 채번/발행 자체를 무효화하지 않고 경고만 담아 돌려준다
// (Gmail 발송 스코프가 아직 승인되지 않았거나 직인 이미지가 없는 초기 상태에서도 발행은 진행되어야 한다).
export async function issueCertificate(id: string): Promise<IssueCertificateResult> {
  await requireCanViewCertificateLog();
  const issued = await markCertificateIssued(id);
  const warnings: string[] = [];

  let documentUrl = '';
  try {
    const origin = await getOrigin();
    const verifyUrl = `${origin}/verify/certificate/${issued.id}`;
    const pdfBuffer = await renderCertificatePdf(issued, verifyUrl);
    const year = new Date(issued['발급일'] || new Date()).getFullYear();
    documentUrl = await uploadCertificatePdf(pdfBuffer, `증명서_${issued['문서번호']}_${issued['대상자성명']}.pdf`, year);
    await setCertificateDocumentUrl(id, documentUrl);
  } catch (error) {
    console.error('[증명서 PDF 생성/저장 실패]', error);
    warnings.push('PDF 생성 또는 Drive 저장에 실패했습니다.');
  }

  let emailSent = false;
  const recipientEmail = issued['대상자이메일'];
  if (!recipientEmail) {
    warnings.push('대상자 이메일이 없어 발급 안내 메일을 보내지 않았습니다.');
  } else {
    try {
      const { subject, body } = buildCertificateEmail(issued, documentUrl);
      await sendMail(recipientEmail, subject, body);
      emailSent = true;
    } catch (error) {
      console.error('[증명서 발급 메일 발송 실패]', error);
      warnings.push('메일 발송에 실패했습니다 (Gmail 발송 권한이 아직 설정되지 않았을 수 있습니다).');
    }
  }

  const staffList = await getStaffList();
  const record = await decorate({ ...issued, 문서URL: documentUrl }, staffList);
  return { record, documentUrl, emailSent, warnings };
}
