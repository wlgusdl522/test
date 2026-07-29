'use server';

import { revalidatePath } from 'next/cache';
import { setReviewCompletion } from '@/lib/mutate/reviewStatus';

export async function setReviewCompletionAction(formData: FormData) {
  const team = String(formData.get('team') ?? '');
  const weekStart = String(formData.get('weekStart') ?? '');
  const flag = String(formData.get('flag') ?? '') === 'true';
  await setReviewCompletion(team, weekStart, flag);
  revalidatePath('/weekly-plan/review');
}
