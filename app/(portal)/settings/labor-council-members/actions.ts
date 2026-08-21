'use server';

import { revalidatePath } from 'next/cache';
import { addLaborCouncilMembers, removeLaborCouncilMember, type LaborCouncilMemberType } from '@/lib/mutate/laborCouncil';
import { getActiveStaffList } from '@/lib/mutate/permissions';

export async function addLaborCouncilMembersAction(formData: FormData) {
  const emails = [...new Set(formData.getAll('emails').map(String).filter(Boolean))];
  if (emails.length === 0) return;
  const 구분: LaborCouncilMemberType = formData.get('구분') === '사용자위원' ? '사용자위원' : '근로자위원';
  const staff = await getActiveStaffList();
  const entries = emails.map((email) => ({
    이메일: email,
    성명: staff.find((s) => s.email === email)?.name ?? '',
    구분,
  }));
  await addLaborCouncilMembers(entries);
  revalidatePath('/settings/labor-council-members');
}

export async function removeLaborCouncilMemberAction(formData: FormData) {
  await removeLaborCouncilMember(String(formData.get('email') ?? ''));
  revalidatePath('/settings/labor-council-members');
}
