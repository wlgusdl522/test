'use server';

import { revalidatePath } from 'next/cache';
import { syncWeeklyTaskDay, toggleSupervisorReflect, toggleTaskHighlight } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

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

// 그리드의 요일 칸 하나를 저장 — 클라이언트 컴포넌트에서 폼이 아니라 함수 호출로 직접 부른다
// (다른 요일 입력 중인 내용을 건드리지 않도록 페이지 전체를 revalidate하지 않는다).
export async function syncMyWeeklyTaskDayAction(date: string, lines: string[]): Promise<Record<string, string>[]> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  return syncWeeklyTaskDay(viewerEmail, me?.성명 ?? '', me?.소속팀 ?? '', date, lines);
}
