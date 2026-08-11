'use server';

import { revalidatePath } from 'next/cache';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
import { setDailyEntry, setMemo } from '@/lib/mutate/worklogEntry';

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
