'use server';

import { revalidatePath } from 'next/cache';
import { saveBoardReportSection, setReportPeriod, type BoardPlanRowInput, type BoardReportType } from '@/lib/mutate/boardPlan';

export async function saveBoardReportSectionAction(구분: BoardReportType, ym: string, rows: BoardPlanRowInput[]): Promise<void> {
  await saveBoardReportSection(구분, ym, rows);
  revalidatePath('/business-summary/report');
}

export async function setReportPeriodAction(formData: FormData): Promise<void> {
  const 구분 = String(formData.get('구분') ?? '') as BoardReportType;
  const ym = String(formData.get('년월') ?? '');
  const 기간텍스트 = String(formData.get('기간텍스트') ?? '');
  await setReportPeriod(구분, ym, 기간텍스트);
  revalidatePath('/business-summary/report');
}
