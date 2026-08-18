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
import { renderAwardPdf } from '@/lib/pdf/awardPdf';
import { uploadCertificatePdf } from '@/lib/drive/certificateFolder';
import { buildAwardEmail, buildCertificateEmail, sendMail } from '@/lib/mail/certificateMail';

// 증명서(재직/경력/원천징수/기타) + 상장 발급대장 — 시트 없이 Supabase가 원본(당직/부재중현황과 동일한 예외 패턴).
// 구분='증명서'는 전자결재(결재상태/결재이력JSON) 대상, 구분='상장'은 결재 없이 즉시 확정된다.
// 채번 시퀀스는 lib/mutate/certNumbering.ts(getSetting/setSetting 기반)를 공유한다.

export { CERTIFICATE_TYPES, AWARD_TYPES, AWARD_TARGET_KINDS } from '@/lib/certificateTypes';

const HEADERS = [
  'id', '문서번호', '구분', '종류', '신청유형', '대상자성명', '대상자소속', '대상자직위', '대상자이메일',
  '생년월일', '성별', '대상자주소', '대상자구분', '담당업무', '퇴직사유', '수령방법', '출처', '근무기간', '신청일', '용도', '본문',
  '등록자이메일', '등록자명', '등록일시',
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

// 결재이력JSON(ApprovalHistoryEntry[])을 시트에 넣기 좋은 한 줄짜리 사람이 읽는 문자열로 편다.
function formatApprovalHistory(historyJson: string): string {
  try {
    const history = JSON.parse(historyJson || '[]') as { 단계: string; 액션: string; 승인자명: string; 일시: string }[];
    if (!Array.isArray(history) || history.length === 0) return '';
    return history.map((h) => `${h.단계}:${h.액션}(${h.승인자명}, ${h.일시})`).join(' → ');
  } catch {
    return '';
  }
}

// 증명서·상장 발급대장(구글시트)에 append — 신청 접수 시점과 발급 확정 시점 둘 다 한 줄씩 남긴다
// (컬럼 "단계"로 구분: 신청 | 발급). 결재상태/결재이력/발행파일 링크까지 함께 남겨서 시트만 보고도
// 진행 상황을 확인할 수 있게 한다. 대장 append 실패로 본 처리 자체가 실패하면 안 되므로
// (원본은 Supabase, 대장은 감사용 사본) 에러를 삼키고 로그만 남긴다.
async function appendCertificateToLedger(record: Record<string, string>, stage: '신청' | '발급'): Promise<void> {
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
      stage,
      record['결재상태'] || '',
      formatApprovalHistory(record['결재이력JSON'] || '[]'),
      record['문서URL'] || '',
    ]);
  } catch (error) {
    console.error('[증명서·상장 발급대장 append 실패]', error);
  }
}

// 서무/회계(기안자 본인 확인) → 총무과 과장 → 부장 → 관장, 4단계 결재. 상장은 서무/회계 단독 1단계 승인.
const STEPS = ['서무/회계', '총무과 과장', '부장', '관장'];
const AWARD_STEPS = ['서무/회계'];

// TEMP(테스트용, 나중에 원복 예정): 재직/경력증명서도 상장처럼 서무/회계 단독 1단계로 임시 변경.
// 되돌릴 때는 아래 return을 `record['구분'] === '상장' ? AWARD_STEPS : STEPS`로 바꾸면 끝.
function stepsFor(record: Record<string, string>): string[] {
  void record;
  return AWARD_STEPS;
}

async function resolveStepApproverEmail(step: string, staffList: Record<string, string>[]): Promise<string> {
  if (step === '서무/회계') return (await getSystemSettings()).certificateClerkEmail;
  if (step === '총무과 과장') return findTeamSupervisorEmail('총무팀', staffList);
  if (step === '부장') return findStaffEmailByPosition('부장', staffList);
  if (step === '관장') return findStaffEmailByPosition('관장', staffList) || (await getSystemSettings()).certificateApproverEmail;
  return '';
}

type DecoratedCertificate = Record<string, string>;

async function decorate(record: Record<string, string>, staffList: Record<string, string>[]): Promise<DecoratedCertificate> {
  const steps = stepsFor(record);
  const staffNameByEmail = (email: string) => staffList.find((s) => s['이메일(아이디)'] === email)?.['성명'] ?? '';
  const approverCache = new Map<string, string>();
  for (const step of steps) {
    approverCache.set(step, await resolveStepApproverEmail(step, staffList));
  }
  const { 결재이력, ...decorated } = decorateApprovalInfo(record, steps, (step) => approverCache.get(step) ?? '', staffNameByEmail);
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
  const pending = all.filter((r) => (r.구분 === '증명서' || r.구분 === '상장') && r.결재상태 === '결재중');
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
    if (h === '신청일') { record[h] = payload['신청일'] || todayISO(); continue; }
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
  await appendCertificateToLedger(record, '신청');
  return getCertificateList();
}

// 상장은 결재(서무/회계 단독 1단계) 이후 발행 시점에 채번되므로, 등록 시점엔 문서번호를 비워두고
// 결재중 상태로 여러 건(콤마로 구분된 대상자 수만큼) 한 번에 만든다.
export async function addAwardBatch(payload: Record<string, string>): Promise<DecoratedCertificate[]> {
  const names = (payload['대상자성명'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (names.length === 0 || !payload['용도']) {
    throw new Error('대상자성명과 수여사유는 필수입니다.');
  }
  const viewerEmail = await requireViewerEmail();
  const staffList = await getStaffList();
  const me = staffList.find((s) => s['이메일(아이디)'] === viewerEmail);

  const rows = names.map((name) => {
    const record: Record<string, string> = {};
    for (const h of HEADERS) {
      if (h === 'id') { record[h] = randomUUID(); continue; }
      if (h === '문서번호') { record[h] = ''; continue; }
      if (h === '구분') { record[h] = '상장'; continue; }
      if (h === '신청유형') { record[h] = '상장'; continue; }
      if (h === '대상자성명') { record[h] = name; continue; }
      if (h === '등록자이메일') { record[h] = viewerEmail; continue; }
      if (h === '등록자명') { record[h] = me?.['성명'] ?? viewerEmail; continue; }
      if (h === '등록일시') { record[h] = nowTimestamp(); continue; }
      if (h === '결재상태') { record[h] = '결재중'; continue; }
      if (h === '결재이력JSON') { record[h] = '[]'; continue; }
      if (h === '발급일') { record[h] = ''; continue; }
      record[h] = payload[h] ?? '';
    }
    return record;
  });

  const { error } = await table().insert(rows);
  if (error) throw new Error(`상장 등록 실패: ${error.message}`);
  for (const row of rows) {
    await appendCertificateToLedger(row, '신청');
  }
  return getCertificateList();
}

export async function actOnCertificate(id: string, action: '승인' | '반려', comment: string): Promise<DecoratedCertificate> {
  const viewerEmail = await requireViewerEmail();
  const existing = await getCertificateById(id);
  if (!existing) throw new Error('처리할 증명서 신청을 찾을 수 없습니다.');

  const staffList = await getStaffList();
  const steps = stepsFor(existing);
  const decorated = await decorate(existing, staffList);
  const admin = await isAdminEmail(viewerEmail);
  const me = staffList.find((s) => s['이메일(아이디)'] === viewerEmail);

  let applied;
  try {
    applied = applyApprovalAction({
      record: existing,
      steps,
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

  // 재직/경력증명서는 관장 최종승인이 나도 여기서 채번하지 않는다 — 채번/직인/PDF저장/메일발송은
  // 서무·회계가 "발행" 버튼을 눌러야 진행되는 별도 단계(issueCertificate)다. 상장은 결재가
  // 서무/회계 단독 1단계뿐이라, 승인 즉시 이 함수 안에서 발행까지 이어서 처리한다.
  const patch: Record<string, string> = { 결재상태: applied.nextStatus, 결재이력JSON: applied.historyJson };
  const { error } = await table().update(patch).eq('id', id);
  if (error) throw new Error(`증명서 처리 실패: ${error.message}`);

  if (existing['구분'] === '상장' && applied.nextStatus === '승인') {
    await issueCertificate(id);
    const reissued = await getCertificateById(id);
    return decorate(reissued ?? { ...existing, ...patch }, staffList);
  }

  return decorate({ ...existing, ...patch }, staffList);
}

// 신청자는 인적사항(성명/생년월일/주소)까지만 적고, 소속·직위·기간·담당업무 등 재직사항은
// "발급 처리" 탭에서 서무/회계·관리자가 실제 인사기록을 확인해 채운 뒤 승인한다.
export async function updateCertificateFields(id: string, fields: Record<string, string>): Promise<void> {
  await requireCanViewCertificateLog();
  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) return;
  const { error } = await table().update(patch).eq('id', id);
  if (error) throw new Error(`증명서 정보 수정 실패: ${error.message}`);
}

// 희망이음에서 출력한 PDF를 서무/회계가 "발급 처리" 단계에서 업로드하는 경로 — 우리 쪽에서
// 직인·QR을 찍어 렌더링하지 않고, 업로드된 파일을 그대로 Drive에 저장해 문서URL로 확정한다.
// 이후 결재(총무과장→부장→관장)는 동일하게 진행되고, issueCertificate()는 이미 문서URL이
// 있으므로 renderCertificatePdf() 렌더링을 건너뛴다.
export async function attachUploadedCertificatePdf(id: string, buffer: Buffer): Promise<void> {
  await requireCanViewCertificateLog();
  const existing = await getCertificateById(id);
  if (!existing) throw new Error('증명서를 찾을 수 없습니다.');

  const year = new Date().getFullYear();
  const filename = `증명서_희망이음_${existing['대상자성명']}_${id.slice(0, 8)}.pdf`;
  const url = await uploadCertificatePdf(buffer, filename, year);
  const { error } = await table().update({ 문서URL: url, 출처: '희망이음업로드' }).eq('id', id);
  if (error) throw new Error(`증명서 파일 저장 실패: ${error.message}`);
}

// 관장 최종승인(상장은 서무/회계 단독승인) 후 누르는 "발행" — 문서번호 채번 + 발급일 확정 + 대장(시트) 기록.
// PDF 생성/직인 스탬프/Drive 저장/수령인 메일 발송은 아래 issueCertificate()에서 이어서 처리한다.
async function markCertificateIssued(id: string): Promise<Record<string, string>> {
  const existing = await getCertificateById(id);
  if (!existing) throw new Error('발행할 문서를 찾을 수 없습니다.');
  if ((existing['구분'] !== '증명서' && existing['구분'] !== '상장') || existing['결재상태'] !== '승인') {
    throw new Error('결재가 완료된 문서만 발행할 수 있습니다.');
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

  // 대장 기록은 여기서 하지 않는다 — 발행파일 링크(문서URL)가 아직 없어서(PDF 생성/업로드는
  // issueCertificate()에서 이어서 진행), 그 링크까지 확정된 뒤 issueCertificate() 끝에서 남긴다.
  return { ...existing, ...patch };
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

// "발행" 하나로 이어지는 전체 처리: 채번/대장기록 → PDF 생성(직인·QR 포함) → Drive 연도별 폴더 저장
// → 메일 발송. PDF·메일 단계는 실패해도 채번/발행 자체를 무효화하지 않고 경고만 담아 돌려준다
// (Gmail 발송 스코프가 아직 승인되지 않았거나 직인 이미지가 없는 초기 상태에서도 발행은 진행되어야 한다).
// 상장은 증명서와 별도 PDF 템플릿을 쓰고, 메일 수신자도 대상자가 아니라 등록자(발급요청 담당자)다 —
// 어르신·자원봉사자 등 상장 대상자는 이메일이 없는 경우가 많기 때문.
// 희망이음에서 업로드된 증명서는 이미 문서URL이 있으므로 자체 렌더링을 건너뛴다.
export async function issueCertificate(id: string): Promise<IssueCertificateResult> {
  await requireCanViewCertificateLog();
  const issued = await markCertificateIssued(id);
  const warnings: string[] = [];
  const isAward = issued['구분'] === '상장';

  let documentUrl = issued['문서URL'] || '';
  const skipRender = issued['출처'] === '희망이음업로드' && !!documentUrl;
  if (!skipRender) {
    try {
      const origin = await getOrigin();
      const verifyUrl = `${origin}/verify/certificate/${issued.id}`;
      const pdfBuffer = isAward
        ? await renderAwardPdf(issued, verifyUrl)
        : await renderCertificatePdf(issued, verifyUrl);
      const year = new Date(issued['발급일'] || new Date()).getFullYear();
      const filenamePrefix = isAward ? '상장' : '증명서';
      documentUrl = await uploadCertificatePdf(pdfBuffer, `${filenamePrefix}_${issued['문서번호']}_${issued['대상자성명']}.pdf`, year);
      await setCertificateDocumentUrl(id, documentUrl);
    } catch (error) {
      console.error('[증명서·상장 PDF 생성/저장 실패]', error);
      warnings.push('PDF 생성 또는 Drive 저장에 실패했습니다.');
    }
  }

  let emailSent = false;
  const recipientEmail = isAward ? issued['등록자이메일'] : issued['대상자이메일'];
  if (!recipientEmail) {
    warnings.push(isAward ? '등록자 이메일이 없어 발급 안내 메일을 보내지 않았습니다.' : '대상자 이메일이 없어 발급 안내 메일을 보내지 않았습니다.');
  } else {
    try {
      const { subject, body } = isAward
        ? buildAwardEmail(issued, documentUrl)
        : buildCertificateEmail(issued, documentUrl);
      await sendMail(recipientEmail, subject, body);
      emailSent = true;
    } catch (error) {
      console.error('[증명서·상장 발급 메일 발송 실패]', error);
      warnings.push('메일 발송에 실패했습니다 (Gmail 발송 권한이 아직 설정되지 않았을 수 있습니다).');
    }
  }

  await appendCertificateToLedger({ ...issued, 문서URL: documentUrl }, '발급');

  const staffList = await getStaffList();
  const record = await decorate({ ...issued, 문서URL: documentUrl }, staffList);
  return { record, documentUrl, emailSent, warnings };
}
