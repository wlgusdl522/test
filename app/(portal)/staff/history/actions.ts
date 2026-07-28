'use server';

import { revalidatePath } from 'next/cache';
import { addAccountHistory } from '@/lib/mutate/accountHistory';
import { getViewerStaffRecord } from '@/lib/auth-helpers';

function buildEmail(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return v.includes('@') ? v : `${v}@sdmsenior.or.kr`;
}

export async function addAccountHistoryAction(formData: FormData) {
  const viewer = await getViewerStaffRecord();
  await addAccountHistory({
    처리일자: String(formData.get('date') ?? new Date().toISOString().slice(0, 10)),
    처리구분: String(formData.get('type') ?? '신규생성'),
    '이전 이메일(계정)': buildEmail(String(formData.get('prevEmail') ?? '')),
    '이전 담당자(성명)': String(formData.get('prevName') ?? ''),
    '신규 이메일(계정)': buildEmail(String(formData.get('newEmail') ?? '')),
    '신규 담당자(성명)': String(formData.get('newName') ?? ''),
    '인계 사유/담당사업': String(formData.get('reason') ?? ''),
    '인계 범위(비고)': String(formData.get('scope') ?? ''),
    '처리자(총무)': viewer?.['성명'] ?? '',
    비고: String(formData.get('note') ?? ''),
  });
  revalidatePath('/staff/history');
}
