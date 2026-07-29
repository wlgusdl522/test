'use server';

import { revalidatePath } from 'next/cache';
import { upsertMeetingMeta } from '@/lib/mutate/meeting';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';

export async function saveMeetingMetaAction(formData: FormData) {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await upsertMeetingMeta({
    소속팀: String(formData.get('team') ?? ''),
    회의일자: String(formData.get('date') ?? ''),
    회의시간: String(formData.get('time') ?? ''),
    회의장소: String(formData.get('place') ?? ''),
    작성자이메일: viewerEmail,
    작성자명: me?.성명 ?? '',
    공지사항: String(formData.get('notice') ?? ''),
    휴가및일정: String(formData.get('leave') ?? ''),
    슈퍼비전: String(formData.get('supervision') ?? ''),
  });
  revalidatePath('/weekly-plan/meeting');
}
