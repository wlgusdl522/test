'use server';

import { revalidatePath } from 'next/cache';
import { ADMIN_EMAILS, requireViewerEmail } from '@/lib/auth-helpers';
import { getDutyLog, saveDutyWeekdayLog, saveDutySaturdaySignature, type DutyOrderType } from '@/lib/supabase/duty';

async function requireOwnerOrAdmin(type: DutyOrderType, id: string, slot: 1 | 2): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (ADMIN_EMAILS.includes(viewerEmail)) return;
  const row = await getDutyLog(type, id);
  if (!row) throw new Error('배정을 찾을 수 없습니다.');
  const assignedEmail = type === 'weekday' ? row['이메일'] : row[`이메일${slot}`];
  if ((assignedEmail ?? '').toLowerCase() !== viewerEmail) {
    throw new Error('본인이 배정된 당직근무일지만 작성할 수 있습니다.');
  }
}

export async function saveDutyWeekdayLogAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await requireOwnerOrAdmin('weekday', id, 1);

  const fields: Record<string, string> = {};
  for (const key of [
    '실별소등확인',
    '사유',
    '창문닫기',
    '사유2',
    '출입문잠금',
    '사유3',
    '전화민원내용',
    '내방객및내방이유',
    '응급및비상시특이사항',
    '퇴근전특근자성명',
    '최종인계자',
  ]) {
    fields[key] = String(formData.get(key) ?? '').trim();
  }
  const signature = String(formData.get('signature') ?? '');

  await saveDutyWeekdayLog(id, fields, signature || undefined);
  revalidatePath(`/duty/log/weekday/${id}`);
  revalidatePath('/duty');
}

export async function saveDutySaturdaySignatureAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const slot = Number(formData.get('slot') ?? '1') === 2 ? 2 : 1;
  await requireOwnerOrAdmin('saturday', id, slot);

  const signature = String(formData.get('signature') ?? '');
  if (!signature) throw new Error('서명을 그려주세요.');

  await saveDutySaturdaySignature(id, slot, signature);
  revalidatePath(`/duty/log/saturday/${id}`);
  revalidatePath('/duty');
}
