'use server';

import { revalidatePath } from 'next/cache';
import { addBusiness, deleteBusiness } from '@/lib/mutate/business';

export async function addBusinessAction(formData: FormData) {
  await addBusiness(String(formData.get('name') ?? ''), String(formData.get('team') ?? ''));
  revalidatePath('/settings/business-list');
}

export async function deleteBusinessAction(formData: FormData) {
  await deleteBusiness(String(formData.get('name') ?? ''));
  revalidatePath('/settings/business-list');
}
