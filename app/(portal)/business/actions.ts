'use server';

import { revalidatePath } from 'next/cache';
import {
  addBasis,
  addBusinessSub,
  addPlanItem,
  deleteBasis,
  deleteBusinessSub,
  deletePlanItem,
  updateBasis,
  updateBusinessSub,
  updatePlanItem,
  upsertBusinessSettings,
} from '@/lib/mutate/businessPlan';

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '');
}
function numOrZero(formData: FormData, key: string): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : 0;
}

export async function saveBusinessSettingsAction(formData: FormData): Promise<void> {
  const 사업명 = str(formData, 'business');
  const 결재라인 = str(formData, 'approvalLine').split(',').map((s) => s.trim()).filter(Boolean);
  await upsertBusinessSettings(사업명, {
    총목표: numOrZero(formData, 'grandGoal'),
    활동내용라벨: str(formData, 'actLabel').trim() || '활동내용',
    결재라인,
  });
  revalidatePath('/business');
}

export async function addSubAction(formData: FormData): Promise<void> {
  await addBusinessSub(str(formData, 'business'), str(formData, 'name'), str(formData, 'effect'));
  revalidatePath('/business');
}

export async function updateSubAction(formData: FormData): Promise<void> {
  await updateBusinessSub(str(formData, 'id'), { 세부사업명: str(formData, 'name'), 기대효과: str(formData, 'effect') });
  revalidatePath('/business');
}

export async function deleteSubAction(formData: FormData): Promise<void> {
  await deleteBusinessSub(str(formData, 'id'));
  revalidatePath('/business');
}

export async function addPlanAction(formData: FormData): Promise<void> {
  await addPlanItem(str(formData, 'subId'), str(formData, 'title'));
  revalidatePath('/business');
}

export async function updatePlanAction(formData: FormData): Promise<void> {
  await updatePlanItem(str(formData, 'id'), {
    제목: str(formData, 'title'),
    표기방식: str(formData, 'mode'),
    예산: numOrZero(formData, 'budget'),
    사업내용: str(formData, 'content'),
  });
  revalidatePath('/business');
}

export async function deletePlanAction(formData: FormData): Promise<void> {
  await deletePlanItem(str(formData, 'id'));
  revalidatePath('/business');
}

export async function addBasisAction(formData: FormData): Promise<void> {
  await addBasis(str(formData, 'planId'), str(formData, 'direct') === '1');
  revalidatePath('/business');
}

export async function updateBasisAction(formData: FormData): Promise<void> {
  await updateBasis(str(formData, 'id'), {
    라벨: str(formData, 'label'),
    직접입력여부: str(formData, 'direct') === 'on',
    인원: numOrZero(formData, 'per'),
    횟수: numOrZero(formData, 'times'),
    단위: str(formData, 'unit') || '회',
    직접건: numOrZero(formData, 'gc'),
    직접명: numOrZero(formData, 'gp'),
  });
  revalidatePath('/business');
}

export async function deleteBasisAction(formData: FormData): Promise<void> {
  await deleteBasis(str(formData, 'id'));
  revalidatePath('/business');
}
