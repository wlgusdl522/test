'use server';

import { revalidatePath } from 'next/cache';
import { addWeeklyTask, deleteWeeklyTask, toggleSupervisorReflect, toggleTaskHighlight } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

export async function addWeeklyTaskAction(formData: FormData) {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await addWeeklyTask({
    '이메일(아이디)': viewerEmail,
    성명: me?.성명 ?? '',
    소속팀: me?.소속팀 ?? '',
    날짜: String(formData.get('date') ?? ''),
    업무내용: String(formData.get('content') ?? ''),
  });
  revalidatePath('/weekly-plan');
}

export async function deleteWeeklyTaskAction(formData: FormData) {
  await deleteWeeklyTask(String(formData.get('id') ?? ''));
  revalidatePath('/weekly-plan');
}

export async function toggleHighlightAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const flag = String(formData.get('flag') ?? '') === 'true';
  await toggleTaskHighlight(id, flag);
  revalidatePath('/weekly-plan');
}

export async function toggleSupervisorReflectAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const flag = String(formData.get('flag') ?? '') === 'true';
  await toggleSupervisorReflect(id, flag);
  revalidatePath('/weekly-plan');
}
