'use server';

import { revalidatePath } from 'next/cache';
import { addGeneralLogItem, deleteGeneralLogItem, updateGeneralLogItem } from '@/lib/mutate/generalLogItem';
import { requireCanManagePermissions } from '@/lib/auth-helpers';

function fieldsFromForm(formData: FormData): Record<string, string> {
  return {
    사업명: String(formData.get('business') ?? ''),
    대분류: String(formData.get('major') ?? ''),
    중분류: String(formData.get('middle') ?? ''),
    세부항목: String(formData.get('detail') ?? ''),
    정렬순서: String(formData.get('order') ?? '0'),
    목표건: String(formData.get('targetCount') ?? ''),
    목표명: String(formData.get('targetPeople') ?? ''),
  };
}

export async function addGeneralLogItemAction(formData: FormData) {
  await requireCanManagePermissions();
  await addGeneralLogItem(fieldsFromForm(formData));
  revalidatePath('/settings/general-log-items');
  revalidatePath('/general-work-log');
}

export async function updateGeneralLogItemAction(formData: FormData) {
  await requireCanManagePermissions();
  const id = String(formData.get('id') ?? '');
  await updateGeneralLogItem(id, fieldsFromForm(formData));
  revalidatePath('/settings/general-log-items');
  revalidatePath('/general-work-log');
}

export async function deleteGeneralLogItemAction(formData: FormData) {
  await requireCanManagePermissions();
  const id = String(formData.get('id') ?? '');
  await deleteGeneralLogItem(id);
  revalidatePath('/settings/general-log-items');
  revalidatePath('/general-work-log');
}
