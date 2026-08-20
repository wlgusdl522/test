'use server';

import { revalidatePath } from 'next/cache';
import { addMeeting, setMeetingStatus, type MeetingStatus } from '@/lib/mutate/laborCouncil';

export async function addMeetingAction(formData: FormData) {
  await addMeeting(
    String(formData.get('회차') ?? ''),
    String(formData.get('회의일시') ?? ''),
    String(formData.get('회의장소') ?? '')
  );
  revalidatePath('/labor-council/meetings');
  revalidatePath('/labor-council/status');
  revalidatePath('/labor-council/minutes');
}

export async function setMeetingStatusAction(formData: FormData) {
  const 회차 = String(formData.get('회차') ?? '');
  const 상태 = (formData.get('상태') === '완료' ? '완료' : '예정') as MeetingStatus;
  await setMeetingStatus(회차, 상태);
  revalidatePath('/labor-council/meetings');
}
