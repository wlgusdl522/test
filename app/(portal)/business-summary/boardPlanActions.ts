'use server';

import { revalidatePath } from 'next/cache';
import {
  addBoardPlanEntry, deleteBoardPlanEntry, moveBoardPlanEntry, updateBoardPlanEntry, type BoardPlanFields,
} from '@/lib/mutate/boardPlan';

function fields(formData: FormData): BoardPlanFields {
  return {
    사업명: String(formData.get('사업명') ?? ''),
    실시월일: String(formData.get('실시월일') ?? ''),
    내용: String(formData.get('내용') ?? ''),
    기대효과: String(formData.get('기대효과') ?? ''),
  };
}

export async function addBoardPlanEntryAction(formData: FormData): Promise<void> {
  await addBoardPlanEntry(fields(formData));
  revalidatePath('/business-summary/plan');
}

export async function updateBoardPlanEntryAction(formData: FormData): Promise<void> {
  await updateBoardPlanEntry(String(formData.get('id') ?? ''), fields(formData));
  revalidatePath('/business-summary/plan');
}

export async function deleteBoardPlanEntryAction(formData: FormData): Promise<void> {
  await deleteBoardPlanEntry(String(formData.get('id') ?? ''));
  revalidatePath('/business-summary/plan');
}

export async function moveBoardPlanEntryAction(formData: FormData): Promise<void> {
  await moveBoardPlanEntry(String(formData.get('id') ?? ''), String(formData.get('direction') ?? 'up') as 'up' | 'down');
  revalidatePath('/business-summary/plan');
}
