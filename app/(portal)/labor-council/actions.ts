'use server';

import { revalidatePath } from 'next/cache';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
import { addAgendaItem, deleteAgendaItem } from '@/lib/mutate/laborCouncil';

export async function addAgendaItemAction(formData: FormData) {
  const 회차 = String(formData.get('회차') ?? '');
  const email = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await addAgendaItem(
    회차,
    String(formData.get('항목명') ?? ''),
    String(formData.get('제안내용') ?? ''),
    email,
    me?.성명 ?? ''
  );
  revalidatePath('/labor-council');
}

export async function deleteAgendaItemAction(formData: FormData) {
  await deleteAgendaItem(String(formData.get('id') ?? ''));
  revalidatePath('/labor-council');
}
