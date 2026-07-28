'use server';

import { revalidatePath } from 'next/cache';
import { addKeyedRecord, deleteKeyedRecord } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE } from '@/lib/sheets/registry';

export async function addBudgetItemAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? '');
  const linked = String(formData.get('linked') ?? '').trim();
  if (!name || !type) throw new Error('예산과목명과 구분을 입력해주세요.');

  await addKeyedRecord(BUDGET_ITEM_TABLE, {
    예산과목명: name,
    구분: type,
    연계사업명: type === '사업비' ? linked : '',
    소관팀: type === '공통비' ? linked : '',
    비고: '',
  });
  revalidatePath('/settings/budget-items');
}

export async function deleteBudgetItemAction(formData: FormData) {
  const name = String(formData.get('name') ?? '');
  await deleteKeyedRecord(BUDGET_ITEM_TABLE, { 예산과목명: name });
  revalidatePath('/settings/budget-items');
}
