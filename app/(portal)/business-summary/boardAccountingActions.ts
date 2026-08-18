'use server';

import { revalidatePath } from 'next/cache';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';
import { setModuleValues } from '@/lib/mutate/boardStat';
import {
  addAccountingItem, deleteAccountingItem, moveAccountingItem, type AccountingSection,
} from '@/lib/mutate/boardAccounting';
import { addBankAccount, deleteBankAccount, moveBankAccount } from '@/lib/mutate/boardBankAccount';

function revalidateAccounting() {
  revalidatePath('/business-summary/accounting');
}

export async function addAccountingItemAction(formData: FormData): Promise<void> {
  const 시설 = String(formData.get('시설') ?? '');
  const 구분 = String(formData.get('구분') ?? '수입') as AccountingSection;
  const 그룹 = String(formData.get('그룹') ?? '');
  const 항목명 = String(formData.get('항목명') ?? '');
  await addAccountingItem(시설, 구분, 그룹, 항목명);
  revalidateAccounting();
}

export async function moveAccountingItemAction(formData: FormData): Promise<void> {
  const 시설 = String(formData.get('시설') ?? '');
  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? 'up') as 'up' | 'down';
  await moveAccountingItem(시설, id, direction);
  revalidateAccounting();
}

export async function deleteAccountingItemAction(formData: FormData): Promise<void> {
  await deleteAccountingItem(String(formData.get('id') ?? ''));
  revalidateAccounting();
}

export async function submitAccountingValuesAction(
  시설: string,
  년월: string,
  entries: { 항목ID: string; 값: number }[]
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await setModuleValues(
    entries.map((e) => ({ 항목ID: e.항목ID, 시설, 년월, 값: e.값 })),
    viewerEmail,
    me?.성명 ?? ''
  );
  revalidateAccounting();
}

export async function addBankAccountAction(formData: FormData): Promise<void> {
  const 시설 = String(formData.get('시설') ?? '');
  const 은행명 = String(formData.get('은행명') ?? '');
  const 계좌번호 = String(formData.get('계좌번호') ?? '');
  const 비고 = String(formData.get('비고') ?? '');
  await addBankAccount(시설, 은행명, 계좌번호, 비고);
  revalidateAccounting();
}

export async function moveBankAccountAction(formData: FormData): Promise<void> {
  const 시설 = String(formData.get('시설') ?? '');
  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? 'up') as 'up' | 'down';
  await moveBankAccount(시설, id, direction);
  revalidateAccounting();
}

export async function deleteBankAccountAction(formData: FormData): Promise<void> {
  await deleteBankAccount(String(formData.get('id') ?? ''));
  revalidateAccounting();
}

export async function submitBankBalanceValuesAction(
  시설: string,
  년월: string,
  entries: { 항목ID: string; 값: number }[]
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await setModuleValues(
    entries.map((e) => ({ 항목ID: e.항목ID, 시설, 년월, 값: e.값 })),
    viewerEmail,
    me?.성명 ?? ''
  );
  revalidateAccounting();
}
