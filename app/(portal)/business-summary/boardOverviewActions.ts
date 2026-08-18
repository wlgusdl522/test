'use server';

import { revalidatePath } from 'next/cache';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';
import { setModuleValues } from '@/lib/mutate/boardStat';
import { saveAdminNotes } from '@/lib/mutate/boardAdminNote';

function revalidateOverview() {
  revalidatePath('/business-summary/overview');
  revalidatePath('/business-summary/overview/view');
}

// 서비스 제공 인원 현황 / 자원봉사자 현황(요약) 둘 다 "항목ID 하나 + 시설별 값"이라 공용으로 쓴다.
export async function submitFacilityStatAction(
  항목ID: string,
  ym: string,
  entries: { 시설: string; 값: number }[]
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await setModuleValues(
    entries.map((e) => ({ 항목ID, 시설: e.시설, 년월: ym, 값: e.값 })),
    viewerEmail,
    me?.성명 ?? ''
  );
  revalidateOverview();
}

export async function saveAdminNotesAction(ym: string, contents: { id?: string; 내용: string }[]): Promise<void> {
  await saveAdminNotes(ym, contents);
  revalidateOverview();
}
