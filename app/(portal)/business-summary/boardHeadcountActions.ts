'use server';

import { revalidatePath } from 'next/cache';
import { saveHeadcountRows, setHeadcountDate, type HeadcountRowInput } from '@/lib/mutate/boardHeadcount';

export async function saveHeadcountRowsAction(ym: string, rows: HeadcountRowInput[]): Promise<void> {
  await saveHeadcountRows(ym, rows);
  revalidatePath('/business-summary');
}

export async function setHeadcountDateAction(formData: FormData): Promise<void> {
  const ym = String(formData.get('년월') ?? '');
  const 기준일 = String(formData.get('기준일') ?? '');
  await setHeadcountDate(ym, 기준일);
  revalidatePath('/business-summary');
}
