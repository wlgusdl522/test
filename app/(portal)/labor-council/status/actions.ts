'use server';

import { revalidatePath } from 'next/cache';
import { deleteAgendaItem, updateAgendaStatus, type AgendaStatus, AGENDA_STATUSES } from '@/lib/mutate/laborCouncil';

export async function updateAgendaStatusAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const 상태raw = String(formData.get('상태') ?? '');
  const 상태 = (AGENDA_STATUSES as string[]).includes(상태raw) ? (상태raw as AgendaStatus) : '접수';
  const 상정회차 = String(formData.get('상정회차') ?? '');
  await updateAgendaStatus(id, 상태, 상정회차);
  revalidatePath('/labor-council/status');
  revalidatePath('/labor-council');
}

export async function deleteAgendaItemAction(formData: FormData) {
  await deleteAgendaItem(String(formData.get('id') ?? ''));
  revalidatePath('/labor-council/status');
  revalidatePath('/labor-council');
}
