'use server';

import { revalidatePath } from 'next/cache';
import { addWeeklyPlanGroupMember, removeWeeklyPlanGroupMember } from '@/lib/mutate/weeklyPlanGroup';

function splitStaffValue(value: string): { email: string; name: string } {
  const [email, name] = value.split('::');
  return { email: email ?? '', name: name ?? '' };
}

export async function addWeeklyPlanGroupMemberAction(formData: FormData) {
  const team = String(formData.get('team') ?? '');
  const groupName = String(formData.get('groupName') ?? '');
  const { email, name } = splitStaffValue(String(formData.get('staff') ?? ''));
  if (!email || !name) throw new Error('직원을 선택해주세요.');
  await addWeeklyPlanGroupMember(team, groupName, email, name);
  revalidatePath('/weekly-plan/groups');
  revalidatePath('/weekly-plan');
}

export async function removeWeeklyPlanGroupMemberAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await removeWeeklyPlanGroupMember(id);
  revalidatePath('/weekly-plan/groups');
  revalidatePath('/weekly-plan');
}
