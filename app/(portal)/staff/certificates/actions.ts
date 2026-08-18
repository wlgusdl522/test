'use server';

import { revalidatePath } from 'next/cache';
import { requireCanViewCertificateLog } from '@/lib/auth-helpers';
import {
  addAwardBatch, addCertificate, actOnCertificate, attachUploadedCertificatePdf, issueCertificate,
  resendCertificateEmail, updateCertificateFields, CERTIFICATE_TYPES,
} from '@/lib/supabase/certificate';

function fieldsFromForm(formData: FormData, keys: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const key of keys) record[key] = String(formData.get(key) ?? '').trim();
  return record;
}

// 신청은 이름/수령방법/비고까지만 — 생년월일·성별·주소·용도는 "발급 처리" 탭에서 서무/회계·관리자가
// 인사기록을 확인해 채운다(직원명부에 있는 정직원 기준). 다만 강사·생활지원사는 직원명부에 없어서
// 소속부서/직위(+강사는 재직·경력기간)를 신청 시점에 본인이 직접 적어서 낸다. 누구나(로그인한
// 직원이면) 자기 증명서를 신청할 수 있다.
export async function addCertificateAction(formData: FormData): Promise<void> {
  const record = fieldsFromForm(formData, [
    '종류', '신청유형', '대상자성명', '대상자소속', '대상자직위', '근무기간', '대상자이메일', '수령방법', '신청일', '용도', '비고',
  ]);
  if (!CERTIFICATE_TYPES.includes(record['종류'] as (typeof CERTIFICATE_TYPES)[number])) {
    throw new Error('증명서 종류를 선택해주세요.');
  }

  await addCertificate(record);
  revalidatePath('/staff/certificates');
}

export async function addAwardAction(formData: FormData): Promise<void> {
  await requireCanViewCertificateLog();
  const record = fieldsFromForm(formData, ['대상자성명', '종류', '대상자구분', '용도', '본문', '비고']);
  await addAwardBatch(record);
  revalidatePath('/staff/certificates');
  revalidatePath('/mypage');
}

export async function actOnCertificateAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') === '반려' ? '반려' : '승인';
  const comment = String(formData.get('comment') ?? '');
  // 상장은 승인=발행이 이 안에서 바로 이어지므로, PDF를 렌더링하기 전에 QR 포함 여부를 먼저 저장해둔다.
  // QR표시여부 컬럼이 아직 Supabase에 추가되기 전이어도(수동 ALTER TABLE 필요) 승인 자체는 막히면 안 된다.
  const qrFlag = formData.get('QR표시여부');
  if (action === '승인' && qrFlag) {
    try {
      await updateCertificateFields(id, { QR표시여부: String(qrFlag) });
    } catch (error) {
      console.error('[QR표시여부 저장 실패 - 컬럼 미생성일 수 있음]', error);
    }
  }
  await actOnCertificate(id, action, comment);
  revalidatePath('/staff/certificates');
  revalidatePath('/mypage');
}

// "발급 처리" 탭 — 서무/회계·관리자가 생년월일/성별/주소/용도(신청자 이관분)와 소속/직위/기간/담당업무
// (재직사항)를 채운 뒤 1단계 승인까지 함께 진행한다. 희망이음에서 출력 가능한 경우엔 직접 입력 대신
// 희망이음 PDF를 업로드하는 것으로 대체한다.
export async function processCertificateAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') === '반려' ? '반려' : '승인';
  const comment = String(formData.get('comment') ?? '');

  if (action === '승인') {
    const source = String(formData.get('출처') ?? '자체양식');
    if (source === '희망이음업로드') {
      const file = formData.get('희망이음파일') as File | null;
      if (!file || file.size === 0) throw new Error('희망이음에서 출력한 PDF 파일을 첨부해주세요.');
      if (file.type !== 'application/pdf') throw new Error('PDF 파일만 업로드할 수 있습니다.');
      const buffer = Buffer.from(await file.arrayBuffer());
      await attachUploadedCertificatePdf(id, buffer);
    } else {
      const fields = fieldsFromForm(formData, [
        '생년월일', '성별', '대상자주소', '용도',
        '대상자소속', '대상자직위', '근무기간', '담당업무', '퇴직사유',
      ]);
      await updateCertificateFields(id, { ...fields, 출처: '자체양식' });
    }
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

export async function resendCertificateEmailAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  await resendCertificateEmail(id);
  revalidatePath('/staff/certificates');
}
