'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addDutyExclusion,
  addDutyHoliday,
  addDutyOrderPerson,
  deleteDutyExclusion,
  deleteDutyHoliday,
  moveDutyOrderPerson,
  reapplyDutyExclusions,
  removeDutyOrderPerson,
  type DutyOrderType,
} from '@/lib/supabase/duty';

function orderType(formData: FormData): DutyOrderType {
  return String(formData.get('type') ?? 'weekday') === 'saturday' ? 'saturday' : 'weekday';
}

function splitStaffValue(value: string): { email: string; name: string } {
  const [email, name] = value.split('::');
  return { email: email ?? '', name: name ?? '' };
}

export async function addDutyOrderAction(formData: FormData) {
  const type = orderType(formData);
  const { email, name } = splitStaffValue(String(formData.get('staff') ?? ''));
  if (!email || !name) throw new Error('직원을 선택해주세요.');
  await addDutyOrderPerson(type, email, name);
  revalidatePath('/settings/duty-lists');
}

export async function moveDutyOrderAction(formData: FormData) {
  const type = orderType(formData);
  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? 'up') as 'up' | 'down';
  await moveDutyOrderPerson(type, id, direction);
  revalidatePath('/settings/duty-lists');
}

export async function removeDutyOrderAction(formData: FormData) {
  const type = orderType(formData);
  const id = String(formData.get('id') ?? '');
  await removeDutyOrderPerson(type, id);
  revalidatePath('/settings/duty-lists');
}

export async function addDutyHolidayAction(formData: FormData) {
  const date = String(formData.get('date') ?? '');
  const name = String(formData.get('name') ?? '');
  await addDutyHoliday(date, name);
  revalidatePath('/settings/duty-lists');
}

export async function deleteDutyHolidayAction(formData: FormData) {
  const date = String(formData.get('date') ?? '');
  await deleteDutyHoliday(date);
  revalidatePath('/settings/duty-lists');
}

export async function addDutyExclusionAction(formData: FormData) {
  const { email, name } = splitStaffValue(String(formData.get('staff') ?? ''));
  const start = String(formData.get('start') ?? '');
  const end = String(formData.get('end') ?? '');
  const reason = String(formData.get('reason') ?? '');
  await addDutyExclusion({ 이메일: email, 성명: name, 시작일: start, 종료일: end, 사유: reason });
  revalidatePath('/settings/duty-lists');
}

export async function deleteDutyExclusionAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await deleteDutyExclusion(id);
  revalidatePath('/settings/duty-lists');
}

// 육아휴직/임신 등으로 제외 목록이 바뀌었을 때, 이미 배포된 미래 배정(아직 서명 안 된 건)에
// 새 제외 규칙을 즉시 반영한다. 결과 건수를 쿼리파라미터로 넘겨 화면에 안내 문구로 보여준다.
export async function reapplyDutyExclusionsAction(formData: FormData) {
  const year = String(formData.get('year') ?? '');
  const result = await reapplyDutyExclusions();
  revalidatePath('/duty');
  const params = new URLSearchParams();
  if (year) params.set('year', year);
  params.set('applied', '1');
  params.set('weekday', String(result.평일교체));
  params.set('saturday', String(result.토요교체));
  redirect(`/settings/duty-lists?${params.toString()}`);
}
