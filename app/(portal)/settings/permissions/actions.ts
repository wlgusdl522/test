'use server';

import { revalidatePath } from 'next/cache';
import { addAdmin, removeAdmin } from '@/lib/auth-helpers';
import { addPageAccessException, getActiveStaffList, removePageAccessException, setPageAccessRule } from '@/lib/mutate/permissions';

export async function addAdminAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const staff = await getActiveStaffList();
  const name = staff.find((s) => s.email.toLowerCase() === email.toLowerCase())?.name ?? '';
  await addAdmin(email, name);
  revalidatePath('/settings/permissions');
}

export async function removeAdminAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  await removeAdmin(email);
  revalidatePath('/settings/permissions');
}

export async function setTierAction(formData: FormData) {
  const pageId = String(formData.get('pageId') ?? '');
  const pageLabel = String(formData.get('pageLabel') ?? '');
  const tier = String(formData.get('tier') ?? '');
  await setPageAccessRule(pageId, pageLabel, tier);
  revalidatePath('/settings/permissions');
}

export async function addExceptionAction(formData: FormData) {
  const pageId = String(formData.get('pageId') ?? '');
  const email = String(formData.get('email') ?? '');
  await addPageAccessException(pageId, email);
  revalidatePath('/settings/permissions');
}

export async function removeExceptionAction(formData: FormData) {
  const pageId = String(formData.get('pageId') ?? '');
  const email = String(formData.get('email') ?? '');
  await removePageAccessException(pageId, email);
  revalidatePath('/settings/permissions');
}
