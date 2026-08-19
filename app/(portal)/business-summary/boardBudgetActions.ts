'use server';

import { revalidatePath } from 'next/cache';
import { addBudgetItem, deleteBudgetItem, moveBudgetItem, saveBudgetRows } from '@/lib/mutate/boardBudgetExecution';

function revalidateAccounting() {
  revalidatePath('/business-summary/accounting');
  revalidatePath('/business-summary/accounting/view');
}

export async function addBudgetItemAction(formData: FormData): Promise<void> {
  const 시설 = String(formData.get('시설') ?? '');
  const 항목명 = String(formData.get('항목명') ?? '');
  await addBudgetItem(시설, 항목명);
  revalidateAccounting();
}

export async function moveBudgetItemAction(formData: FormData): Promise<void> {
  const 시설 = String(formData.get('시설') ?? '');
  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? 'up') as 'up' | 'down';
  await moveBudgetItem(시설, id, direction);
  revalidateAccounting();
}

export async function deleteBudgetItemAction(formData: FormData): Promise<void> {
  await deleteBudgetItem(String(formData.get('id') ?? ''));
  revalidateAccounting();
}

export async function submitBudgetRowsAction(
  시설: string,
  ym: string,
  rows: { 항목ID: string; 예산액: number; 집행액: number; 누계: number; 비고: string }[]
): Promise<void> {
  await saveBudgetRows(시설, ym, rows);
  revalidateAccounting();
}
