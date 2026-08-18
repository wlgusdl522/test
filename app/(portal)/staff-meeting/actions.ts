'use server';

import { revalidatePath } from 'next/cache';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
import {
  addStaffMeetingItem,
  deleteStaffMeetingItem,
  moveStaffMeetingItem,
  setStaffMeetingValues,
} from '@/lib/mutate/staffMeeting';

export async function addStaffMeetingItemAction(formData: FormData) {
  await addStaffMeetingItem(String(formData.get('팀명') ?? ''), String(formData.get('사업구분') ?? ''));
  revalidatePath('/staff-meeting');
}

export async function deleteStaffMeetingItemAction(formData: FormData) {
  await deleteStaffMeetingItem(String(formData.get('id') ?? ''));
  revalidatePath('/staff-meeting');
}

export async function moveStaffMeetingItemAction(formData: FormData) {
  await moveStaffMeetingItem(
    String(formData.get('팀명') ?? ''),
    String(formData.get('id') ?? ''),
    formData.get('direction') === 'up' ? 'up' : 'down'
  );
  revalidatePath('/staff-meeting');
}

export async function submitStaffMeetingValuesAction(
  팀명: string,
  ym: string,
  entries: { 사업구분ID: string; 업무보고: string; 업무계획: string; 협조사항: string }[]
) {
  const email = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await setStaffMeetingValues(팀명, ym, entries, email, me?.성명 ?? '');
  revalidatePath('/staff-meeting');
  revalidatePath('/staff-meeting/view');
}
