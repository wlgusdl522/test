'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateDutyBatch, swapDutyAssignment, type DutyOrderType } from '@/lib/supabase/duty';

// /settings/duty-lists의 "2개월 배포" 폼에서 호출된다 — 결과 건수를 안내 문구로 보여주려고
// 처리 후 그 화면으로 돌아간다.
export async function generateDutyBatchAction(formData: FormData) {
  const start = String(formData.get('start') ?? '');
  const end = String(formData.get('end') ?? '');
  if (!start || !end) throw new Error('시작일/종료일을 입력해주세요.');
  const result = await generateDutyBatch(start, end);
  revalidatePath('/duty');

  const params = new URLSearchParams();
  params.set('deployed', '1');
  params.set('weekdayNew', String(result.평일생성));
  params.set('saturdayNew', String(result.토요생성));
  redirect(`/settings/duty-lists?${params.toString()}`);
}

export async function swapDutyAssignmentAction(formData: FormData) {
  const type = String(formData.get('type') ?? 'weekday') as DutyOrderType;
  const id = String(formData.get('id') ?? '');
  const slot = Number(formData.get('slot') ?? '1') === 2 ? 2 : 1;
  const [email, name, team] = String(formData.get('staff') ?? '').split('::');
  if (!email || !name) throw new Error('교체할 직원을 선택해주세요.');
  await swapDutyAssignment(type, id, slot, email, name, team ?? '');
  revalidatePath('/duty');
}
