'use server';

import { revalidatePath } from 'next/cache';
import { submitWeeklyTaskDay, toggleSupervisorReflect } from '@/lib/mutate/weeklyTask';
import { setReviewCompletion } from '@/lib/mutate/reviewStatus';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

// "부서장확인" 탭의 반영 버튼 — 체크만으로는 저장되지 않고, 이걸 눌러야 바뀐 항목들이 한 번에 저장된다.
// 누르는 순간 그 팀/그 주의 완료 표시도 같이 켜져서 따로 완료 처리를 누를 필요가 없다.
export async function submitSupervisorReflectionsAction(
  team: string,
  weekStart: string,
  changes: { id: string; flagged: boolean }[]
): Promise<void> {
  for (const { id, flagged } of changes) await toggleSupervisorReflect(id, flagged);
  await setReviewCompletion(team, weekStart, true);
  revalidatePath('/weekly-plan/review');
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
