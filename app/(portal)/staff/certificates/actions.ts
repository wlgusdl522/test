'use server';

import { revalidatePath } from 'next/cache';
import { requireCanViewCertificateLog } from '@/lib/auth-helpers';
import { addAward, addCertificate, actOnCertificate, CERTIFICATE_TYPES } from '@/lib/supabase/certificate';

function fieldsFromForm(formData: FormData, keys: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const key of keys) record[key] = String(formData.get(key) ?? '').trim();
  return record;
}

export async function addCertificateAction(formData: FormData): Promise<void> {
  await requireCanViewCertificateLog();
  const staffValue = String(formData.get('staff') ?? '');
  const [, staffName, staffTeam] = staffValue.split('::');

  const record = fieldsFromForm(formData, ['종류', '대상자직위', '근무기간', '용도', '비고']);
  record['대상자성명'] = (String(formData.get('대상자성명') ?? '').trim() || staffName || '').trim();
  record['대상자소속'] = (String(formData.get('대상자소속') ?? '').trim() || staffTeam || '').trim();
  if (!CERTIFICATE_TYPES.includes(record['종류'] as (typeof CERTIFICATE_TYPES)[number])) {
    throw new Error('증명서 종류를 선택해주세요.');
  }

  await addCertificate(record);
  revalidatePath('/staff/certificates');
}

export async function addAwardAction(formData: FormData): Promise<void> {
  await requireCanViewCertificateLog();
  const record = fieldsFromForm(formData, ['대상자성명', '대상자소속', '용도', '발급일', '비고']);
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
