'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addCardLedgerRecord, deleteCardLedgerRecord, updateCardLedgerRecord } from '@/lib/mutate/cardLedger';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
import { mineRedirectUrl } from '@/lib/expensesNav';

async function payloadFromForm(formData: FormData): Promise<Record<string, string>> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const exempt = formData.get('exempt') === 'on';
  return {
    구분: String(formData.get('type') ?? ''),
    사용일자: String(formData.get('date') ?? ''),
    담당자이메일: viewerEmail,
    담당자명: String(formData.get('name') ?? '').trim() || me?.성명 || '',
    사용금액: String(formData.get('amount') ?? ''),
    예산과목: String(formData.get('budgetItem') ?? ''),
    사용내역: String(formData.get('description') ?? ''),
    카드번호: String(formData.get('cardNo') ?? ''),
    검수불요여부: exempt ? 'Y' : 'N',
    검수불요사유: exempt ? String(formData.get('exemptReason') ?? '').trim() : '',
  };
}

export async function addCardLedgerAction(formData: FormData): Promise<void> {
  const { id } = await addCardLedgerRecord(await payloadFromForm(formData));
  redirect(mineRedirectUrl(formData, { focus: id }));
}

export async function updateCardLedgerAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  await updateCardLedgerRecord(id, await payloadFromForm(formData));
  redirect(mineRedirectUrl(formData, { focus: id }));
}

export async function deleteCardLedgerAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await deleteCardLedgerRecord(id);
  revalidatePath('/expenses/mine');
}
