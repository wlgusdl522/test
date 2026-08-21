'use server';

import { revalidatePath } from 'next/cache';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
import { addAgendaItem, sendAgendaNotification, type AgendaVisibility } from '@/lib/mutate/laborCouncil';

export async function addAgendaItemAction(formData: FormData) {
  const email = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const 공개여부 = (formData.get('공개여부') === '익명' ? '익명' : '실명') as AgendaVisibility;
  await addAgendaItem(
    String(formData.get('항목명') ?? ''),
    String(formData.get('제안내용') ?? ''),
    공개여부,
    email,
    me?.성명 ?? ''
  );
  revalidatePath('/labor-council');
  revalidatePath('/labor-council/propose');
  revalidatePath('/labor-council/status');
}

export async function sendAgendaNotificationAction(formData: FormData) {
  await sendAgendaNotification(String(formData.get('제목') ?? ''), String(formData.get('내용') ?? ''));
}
