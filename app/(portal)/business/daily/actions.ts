'use server';

import { revalidatePath } from 'next/cache';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
import { bulkSetDailyEntries, setDailyEntry, setMemo } from '@/lib/mutate/worklogEntry';

export async function submitDailyEntriesAction(
  business: string,
  date: string,
  entries: { id: string; gc: number; gp: number }[],
  content: string,
  note: string
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const name = me?.성명 ?? '';
  for (const e of entries) {
    await setDailyEntry(business, e.id, date, e.gc, e.gp, viewerEmail, name);
  }
  await setMemo(business, date, content, note, viewerEmail, name);
  revalidatePath('/business/daily');
  revalidatePath('/business/monthly');
}

export async function bulkImportDailyEntriesAction(
  business: string,
  entries: { 항목ID: string; 날짜: string; 건: number; 명: number }[]
): Promise<number> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const name = me?.성명 ?? '';
  const count = await bulkSetDailyEntries(business, entries, viewerEmail, name);
  revalidatePath('/business/daily');
  revalidatePath('/business/monthly');
  return count;
}
