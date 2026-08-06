'use server';

import { revalidatePath } from 'next/cache';
import { addBusiness, deleteBusiness } from '@/lib/mutate/business';
import { upsertBusinessSettings } from '@/lib/mutate/businessPlan';

export async function addBusinessAction(formData: FormData) {
  await addBusiness(String(formData.get('name') ?? ''), String(formData.get('team') ?? ''));
  revalidatePath('/settings/business-list');
}

export async function deleteBusinessAction(formData: FormData) {
  await deleteBusiness(String(formData.get('name') ?? ''));
  revalidatePath('/settings/business-list');
}

export async function saveBusinessSettingsAction(formData: FormData): Promise<void> {
  const 사업명 = String(formData.get('business') ?? '');
  const 결재라인 = String(formData.get('approvalLine') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const grandGoal = Number(formData.get('grandGoal'));
  await upsertBusinessSettings(사업명, {
    총목표: Number.isFinite(grandGoal) ? grandGoal : 0,
    활동내용라벨: String(formData.get('actLabel') ?? '').trim() || '활동내용',
    결재라인,
  });
  revalidatePath('/settings/business-list');
  revalidatePath('/business');
}
