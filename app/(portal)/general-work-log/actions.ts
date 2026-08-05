'use server';

import { revalidatePath } from 'next/cache';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';
import { saveGeneralLogDaily, submitGeneralLogContentDay, saveGeneralLogNote } from '@/lib/mutate/generalLog';

export async function saveGeneralLogDayAction(
  businessName: string,
  date: string,
  dailyEntries: { 항목ID: string; 건: string; 명: string }[],
  contentRows: { 업무내용: string; 실적: string; 비고: string }[],
  note: string
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const name = me?.성명 ?? '';

  await saveGeneralLogDaily(businessName, date, dailyEntries, viewerEmail, name);
  await submitGeneralLogContentDay(businessName, date, contentRows, viewerEmail, name);
  await saveGeneralLogNote(businessName, date, note, viewerEmail, name);

  revalidatePath('/general-work-log');
}
