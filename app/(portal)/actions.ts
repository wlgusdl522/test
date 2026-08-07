'use server';

import { revalidatePath } from 'next/cache';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';
import { setAwayStatus, clearAwayStatus } from '@/lib/supabase/staffStatus';

export async function setAwayAction(formData: FormData): Promise<void> {
  const email = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) throw new Error('사유를 선택해주세요.');

  await setAwayStatus(email, me?.성명 ?? '', me?.소속팀 ?? '', reason);
  revalidatePath('/');
}

export async function clearAwayAction(): Promise<void> {
  const email = await requireViewerEmail();
  const me = await getViewerStaffRecord();

  await clearAwayStatus(email, me?.성명 ?? '', me?.소속팀 ?? '');
  revalidatePath('/');
}
