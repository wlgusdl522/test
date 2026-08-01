'use server';

import { revalidatePath } from 'next/cache';
import { upsertMeetingMeta } from '@/lib/mutate/meeting';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';

export async function saveMeetingMetaAction(payload: {
  team: string;
  date: string;
  time: string;
  place: string;
  notice: string;
  leave: string;
  supervision: string;
}): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  await upsertMeetingMeta({
    소속팀: payload.team,
    회의일자: payload.date,
    회의시간: payload.time,
    회의장소: payload.place,
    작성자이메일: viewerEmail,
    작성자명: me?.성명 ?? '',
    공지사항: payload.notice,
    휴가및일정: payload.leave,
    슈퍼비전: payload.supervision,
  });
  revalidatePath('/weekly-plan/meeting');
}
