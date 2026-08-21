'use server';

import { revalidatePath } from 'next/cache';
import { isAdminEmail, requireViewerEmail } from '@/lib/auth-helpers';
import {
  getDutyLog,
  saveDutySaturdayLog,
  saveDutySaturdaySignature,
  saveDutyWeekdayLog,
  type DutyOrderType,
} from '@/lib/supabase/duty';

async function requireOwnerOrAdmin(type: DutyOrderType, id: string, slot: 1 | 2): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (await isAdminEmail(viewerEmail)) return;
  const row = await getDutyLog(type, id);
  if (!row) throw new Error('배정을 찾을 수 없습니다.');
  const assignedEmail = type === 'weekday' ? row['이메일'] : row[`이메일${slot}`];
  if ((assignedEmail ?? '').toLowerCase() !== viewerEmail) {
    throw new Error('본인이 배정된 당직근무일지만 작성할 수 있습니다.');
  }
}

// 토요 근무일지는 두 슬롯(2인) 중 배정된 어느 쪽이든 공용 일지 내용을 작성할 수 있다.
async function requireSaturdayJournalOwnerOrAdmin(id: string): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  if (await isAdminEmail(viewerEmail)) return;
  const row = await getDutyLog('saturday', id);
  if (!row) throw new Error('배정을 찾을 수 없습니다.');
  const assigned = [row['이메일1'], row['이메일2']].map((e) => (e ?? '').toLowerCase());
  if (!assigned.includes(viewerEmail)) {
    throw new Error('본인이 배정된 당직근무일지만 작성할 수 있습니다.');
  }
}

// 평일/토요 근무일지 내용 필드는 동일하다. 퇴근전특근자성명만 팀별 체크박스에서 여러 명을
// 고를 수 있어 getAll로 모아 쉼표로 합치고, 나머지는 단일 값(라디오 포함)이라 get으로 충분하다.
function collectLogFields(formData: FormData): Record<string, string> {
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
    '최종인계자',
  ]) {
    fields[key] = String(formData.get(key) ?? '').trim();
  }
  fields['퇴근전특근자성명'] = formData
    .getAll('퇴근전특근자성명')
    .map((v) => String(v).trim())
    .filter(Boolean)
    .join(', ');
  return fields;
}

export async function saveDutyWeekdayLogAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await requireOwnerOrAdmin('weekday', id, 1);

  const fields = collectLogFields(formData);
  const signature = String(formData.get('signature') ?? '');

  await saveDutyWeekdayLog(id, fields, signature || undefined);
  revalidatePath(`/duty/log/weekday/${id}`);
  revalidatePath('/duty');
}

export async function saveDutySaturdayLogAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await requireSaturdayJournalOwnerOrAdmin(id);

  const fields = collectLogFields(formData);
  await saveDutySaturdayLog(id, fields);
  revalidatePath(`/duty/log/saturday/${id}`);
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
