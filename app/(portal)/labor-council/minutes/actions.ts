'use server';

import { revalidatePath } from 'next/cache';
import { saveMinutes, type AttendeeRow, type ResolutionRow } from '@/lib/mutate/laborCouncil';

export async function saveMinutesAction(formData: FormData) {
  const 회차 = String(formData.get('회차') ?? '');
  const 협의의결 = JSON.parse(String(formData.get('협의의결JSON') ?? '[]')) as ResolutionRow[];
  const 참석자 = JSON.parse(String(formData.get('참석자JSON') ?? '[]')) as AttendeeRow[];

  await saveMinutes(회차, {
    회의일시: String(formData.get('회의일시') ?? ''),
    회의장소: String(formData.get('회의장소') ?? ''),
    협의의결,
    보고사항: String(formData.get('보고사항') ?? ''),
    의결된사항: String(formData.get('의결된사항') ?? ''),
    참석자,
  });
  revalidatePath('/labor-council/minutes');
  revalidatePath('/print/labor-council-minutes');
}
