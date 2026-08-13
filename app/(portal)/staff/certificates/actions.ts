'use server';

import { revalidatePath } from 'next/cache';
import { requireCanViewCertificateLog } from '@/lib/auth-helpers';
import {
  addAward, addCertificate, actOnCertificate, issueCertificate, updateCertificateFields, CERTIFICATE_TYPES,
} from '@/lib/supabase/certificate';

function fieldsFromForm(formData: FormData, keys: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const key of keys) record[key] = String(formData.get(key) ?? '').trim();
  return record;
}

// 신청은 본인 인적사항까지만 — 소속/직위/기간/담당업무는 발급 처리 단계에서 담당자가 채우므로
// 누구나(로그인한 직원이면) 자기 증명서를 신청할 수 있다.
export async function addCertificateAction(formData: FormData): Promise<void> {
  const record = fieldsFromForm(formData, [
    '종류', '신청유형', '대상자성명', '대상자이메일',
    '생년월일', '성별', '대상자주소', '수령방법', '신청일', '용도', '비고',
  ]);
  if (!CERTIFICATE_TYPES.includes(record['종류'] as (typeof CERTIFICATE_TYPES)[number])) {
    throw new Error('증명서 종류를 선택해주세요.');
  }

  await addCertificate(record);
  revalidatePath('/staff/certificates');
}

export async function addAwardAction(formData: FormData): Promise<void> {
  await requireCanViewCertificateLog();
  const record = fieldsFromForm(formData, ['대상자성명', '대상자소속', '대상자이메일', '용도', '발급일', '비고']);
  await addAward(record);
  revalidatePath('/staff/certificates');
}

export async function actOnCertificateAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') === '반려' ? '반려' : '승인';
  const comment = String(formData.get('comment') ?? '');
  await actOnCertificate(id, action, comment);
  revalidatePath('/staff/certificates');
  revalidatePath('/mypage');
}

// "발급 처리" 탭 — 서무/회계·관리자가 소속/직위/기간/담당업무(재직사항)를 채운 뒤 1단계 승인까지 함께 진행한다.
export async function processCertificateAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') === '반려' ? '반려' : '승인';
  const comment = String(formData.get('comment') ?? '');

  if (action === '승인') {
    const fields = fieldsFromForm(formData, ['대상자소속', '대상자직위', '근무기간', '담당업무', '퇴직사유']);
    await updateCertificateFields(id, fields);
  }
  await actOnCertificate(id, action, comment);
  revalidatePath('/staff/certificates');
  revalidatePath('/mypage');
}

export async function issueCertificateAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const result = await issueCertificate(id);
  if (result.warnings.length > 0) {
    console.warn(`[증명서 발행 경고] id=${id}`, result.warnings);
  }
  revalidatePath('/staff/certificates');
}
