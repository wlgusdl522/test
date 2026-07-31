'use server';

import { revalidatePath } from 'next/cache';
import { submitWeeklyTaskDay, toggleSupervisorReflect } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

export async function toggleSupervisorReflectAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const flag = String(formData.get('flag') ?? '') === 'true';
  await toggleSupervisorReflect(id, flag);
  revalidatePath('/weekly-plan');
}

// "작성" 탭의 제출 버튼 — 그때까지 로컬에만 쌓여있던 한 주(월~토) 전체를 한 번에 반영한다.
export async function submitWeeklyPlanAction(
  tasksByDay: Record<string, { text: string; flagged: boolean }[]>
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const name = me?.성명 ?? '';
  const team = me?.소속팀 ?? '';
  for (const [date, entries] of Object.entries(tasksByDay)) {
    await submitWeeklyTaskDay(viewerEmail, name, team, date, entries);
  }
  revalidatePath('/weekly-plan');
}
