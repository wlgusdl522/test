'use server';

import { revalidatePath } from 'next/cache';
import { addLaborCouncilMember, removeLaborCouncilMember } from '@/lib/mutate/laborCouncil';
import { getActiveStaffList } from '@/lib/mutate/permissions';

export async function addLaborCouncilMemberAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const 구분 = formData.get('구분') === '사용자위원' ? '사용자위원' : '근로자위원';
  const staff = await getActiveStaffList();
  const found = staff.find((s) => s.email === email);
  await addLaborCouncilMember(email, found?.name ?? '', 구분);
  revalidatePath('/settings/labor-council-members');
}

export async function removeLaborCouncilMemberAction(formData: FormData) {
  await removeLaborCouncilMember(String(formData.get('email') ?? ''));
  revalidatePath('/settings/labor-council-members');
}
