'use server';

import { revalidatePath } from 'next/cache';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';
import { saveGeneralLogDaily, submitGeneralLogContentDay } from '@/lib/mutate/generalLog';
import { addGeneralLogItem, deleteGeneralLogItem, updateGeneralLogItem } from '@/lib/mutate/generalLogItem';

export type GeneralLogTargetUpdate = {
  id: string;
  사업명: string;
  대분류: string;
  중분류: string;
  세부항목: string;
  정렬순서: string;
  목표건: string;
  목표명: string;
};

export async function saveGeneralLogDayAction(
  businessName: string,
  date: string,
  dailyEntries: { 항목ID: string; 건: string; 명: string }[],
  contentRows: { 업무내용: string }[],
  note: string,
  targetUpdates: GeneralLogTargetUpdate[]
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const name = me?.성명 ?? '';

  for (const t of targetUpdates) await updateGeneralLogItem(t.id, t);
  await saveGeneralLogDaily(businessName, date, dailyEntries, viewerEmail, name);
  await submitGeneralLogContentDay(businessName, date, contentRows, note, viewerEmail, name);

  revalidatePath('/general-work-log');
}

// 담당자가 화면에서 바로 이 사업의 구분항목(대분류/중분류/세부항목)을 추가한다 — 사업마다 항목 구성이
// 전혀 다르므로 별도 관리자 설정화면 없이 총괄업무일지 화면 자체에서 늘려갈 수 있어야 한다.
export async function addGeneralLogCategoryAction(fields: {
  사업명: string;
  대분류: string;
  중분류: string;
  세부항목: string;
  정렬순서: string;
  목표건: string;
  목표명: string;
}): Promise<void> {
  await requireViewerEmail();
  await addGeneralLogItem(fields);
  revalidatePath('/general-work-log');
}

// 이미 입력된 일계 데이터는 시트에 그대로 남지만, 항목 자체가 없어지므로 화면(통계표)에는
// 더 이상 나오지 않는다.
export async function deleteGeneralLogCategoryAction(id: string): Promise<void> {
  await requireViewerEmail();
  await deleteGeneralLogItem(id);
  revalidatePath('/general-work-log');
}
