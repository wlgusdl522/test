'use server';

import { revalidatePath } from 'next/cache';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';
import { NO_FACILITY, setModuleValues } from '@/lib/mutate/boardStat';
import { setHeadcountDate } from '@/lib/mutate/boardHeadcount';

function revalidateHeadcount() {
  revalidatePath('/business-summary/headcount');
  revalidatePath('/business-summary/headcount/view');
}

export async function submitHeadcountValuesAction(
  ym: string,
  entries: { 항목ID: string; 실인원: number; 비고: string }[]
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await setModuleValues(
    entries.map((e) => ({ 항목ID: e.항목ID, 시설: NO_FACILITY, 년월: ym, 값: e.실인원, 비고: e.비고 })),
    viewerEmail,
    me?.성명 ?? ''
  );
  revalidateHeadcount();
}

export async function setHeadcountDateAction(formData: FormData): Promise<void> {
  const ym = String(formData.get('년월') ?? '');
  const 기준일 = String(formData.get('기준일') ?? '');
  await setHeadcountDate(ym, 기준일);
  revalidateHeadcount();
}
