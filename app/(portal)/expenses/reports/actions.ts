'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  actOnItemCheckReport,
  addItemCheckReport,
  deleteItemCheckReport,
  updateItemCheckReport,
} from '@/lib/mutate/itemCheckReport';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { mineRedirectUrl } from '@/lib/expensesNav';

async function payloadFromForm(formData: FormData): Promise<Record<string, string>> {
  const me = await getViewerStaffRecord();
  return {
    카드사용대장ID: String(formData.get('ledgerId') ?? ''),
    품명: String(formData.get('itemName') ?? ''),
    납품처상호: String(formData.get('vendorName') ?? ''),
    납품처대표자: String(formData.get('vendorOwner') ?? ''),
    계약금액: String(formData.get('contractAmount') ?? ''),
    계약체결년월일: String(formData.get('contractDate') ?? ''),
    납품기한: String(formData.get('deliveryDue') ?? ''),
    납품완료일자: String(formData.get('deliveryDate') ?? ''),
    검수년월일: String(formData.get('checkDate') ?? ''),
    검수장소: String(formData.get('checkPlace') ?? ''),
    등록구분: String(formData.get('registerType') ?? '비대상'),
    비품등록번호: String(formData.get('assetNo') ?? ''),
    규격: String(formData.get('spec') ?? ''),
    단위: String(formData.get('unit') ?? ''),
    수량: String(formData.get('qty') ?? ''),
    단가: String(formData.get('unitPrice') ?? ''),
    금액: String(formData.get('amount') ?? ''),
    비고: String(formData.get('note') ?? ''),
    검수자이메일: me?.['이메일(아이디)'] ?? '',
    검수자명: me?.성명 ?? '',
    소속부서: me?.소속팀 ?? '',
    품목명: String(formData.get('lineItemName') ?? ''),
  };
}

export async function addItemCheckReportAction(formData: FormData): Promise<void> {
  const ledgerId = String(formData.get('ledgerId') ?? '');
  await addItemCheckReport(await payloadFromForm(formData));
  redirect(mineRedirectUrl(formData, { focus: ledgerId }));
}

export async function updateItemCheckReportAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const ledgerId = String(formData.get('ledgerId') ?? '');
  await updateItemCheckReport(id, await payloadFromForm(formData));
  redirect(mineRedirectUrl(formData, { focus: ledgerId }));
}

export async function deleteItemCheckReportAction(formData: FormData) {
  await deleteItemCheckReport(String(formData.get('id') ?? ''));
  revalidatePath('/expenses/mine');
}

export async function actOnItemCheckReportAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') as '승인' | '반려';
  const comment = String(formData.get('comment') ?? '');
  await actOnItemCheckReport(id, action, comment);
  revalidatePath('/expenses/mine');
  revalidatePath('/mypage');
}
