'use server';

import { revalidatePath } from 'next/cache';
import { addCardLedgerRecord, deleteCardLedgerRecord, updateCardLedgerRecord } from '@/lib/mutate/cardLedger';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

async function payloadFromForm(formData: FormData): Promise<Record<string, string>> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  return {
    구분: String(formData.get('type') ?? ''),
    사용일자: String(formData.get('date') ?? ''),
    담당자이메일: viewerEmail,
    담당자명: String(formData.get('name') ?? '').trim() || me?.성명 || '',
    사용금액: String(formData.get('amount') ?? ''),
    예산과목: String(formData.get('budgetItem') ?? ''),
    사용내역: String(formData.get('description') ?? ''),
    카드번호: String(formData.get('cardNo') ?? ''),
  };
}

export async function addCardLedgerAction(formData: FormData) {
  await addCardLedgerRecord(await payloadFromForm(formData));
  revalidatePath('/expenses');
}

export async function updateCardLedgerAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await updateCardLedgerRecord(id, await payloadFromForm(formData));
  revalidatePath('/expenses');
}

export async function deleteCardLedgerAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await deleteCardLedgerRecord(id);
  revalidatePath('/expenses');
}
