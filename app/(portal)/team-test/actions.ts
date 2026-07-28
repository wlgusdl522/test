'use server';

import { revalidatePath } from 'next/cache';
import { addTeam, deleteTeam, moveTeam } from '@/lib/mutate/team';

export async function addTeamAction(formData: FormData) {
  await addTeam(String(formData.get('value') ?? ''));
  revalidatePath('/team-test');
}

export async function deleteTeamAction(formData: FormData) {
  await deleteTeam(String(formData.get('value') ?? ''));
  revalidatePath('/team-test');
}

export async function moveTeamAction(formData: FormData) {
  const direction = String(formData.get('direction') ?? 'up') as 'up' | 'down';
  await moveTeam(String(formData.get('value') ?? ''), direction);
  revalidatePath('/team-test');
}
