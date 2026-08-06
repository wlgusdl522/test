'use server';

import { revalidatePath } from 'next/cache';
import { addAccountHistory } from '@/lib/mutate/accountHistory';
import { addStaff, deleteStaff, updateStaff } from '@/lib/mutate/staff';
import { getViewerStaffRecord } from '@/lib/auth-helpers';

function buildEmail(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return v.includes('@') ? v : `${v}@sdmsenior.or.kr`;
}

function staffPayloadFromForm(formData: FormData): Record<string, string> {
  const status = String(formData.get('status') ?? '재직');
  const isOnLeave = status === '휴직';
  const businesses = formData.getAll('business').map(String);
  return {
    '이메일(아이디)': buildEmail(String(formData.get('email') ?? '')),
    성명: String(formData.get('name') ?? '').trim(),
    소속팀: String(formData.get('team') ?? ''),
    담당사업: businesses.join(', '),
    '직급/직책': String(formData.get('position') ?? ''),
    당직대상여부: String(formData.get('dutyEligible') ?? 'Y'),
    토요당직제외여부: String(formData.get('saturdayDutyExcluded') ?? 'N'),
    내선번호: String(formData.get('extension') ?? ''),
    휴대폰번호: String(formData.get('mobile') ?? ''),
    입사일: String(formData.get('hireDate') ?? ''),
    퇴사일: String(formData.get('resignDate') ?? ''),
    재직상태: status,
    휴직시작일: isOnLeave ? String(formData.get('leaveStart') ?? '') : '',
    '휴직종료일(예정)': isOnLeave ? String(formData.get('leaveEnd') ?? '') : '',
    휴직사유: isOnLeave ? String(formData.get('leaveReason') ?? '').trim() : '',
    비고: String(formData.get('note') ?? '').trim(),
  };
}

export async function registerStaffAction(formData: FormData) {
  const staffPayload = staffPayloadFromForm(formData);
  const processType = String(formData.get('processType') ?? '신규생성');
  const prevEmail = processType === '계정인계' ? String(formData.get('prevEmail') ?? '') : '';
  const prevName = processType === '계정인계' ? String(formData.get('prevName') ?? '') : '';

  if (processType === '계정인계' && !prevEmail) {
    throw new Error('계정 인계를 선택한 경우 이전 담당자를 선택해주세요.');
  }

  await addStaff(staffPayload);

  const viewer = await getViewerStaffRecord();
  const today = new Date().toISOString().slice(0, 10);
  await addAccountHistory({
    처리일자: today,
    처리구분: processType,
    '이전 이메일(계정)': prevEmail,
    '이전 담당자(성명)': prevName,
    '신규 이메일(계정)': staffPayload['이메일(아이디)'],
    '신규 담당자(성명)': staffPayload['성명'],
    '인계 사유/담당사업': staffPayload['담당사업'],
    '인계 범위(비고)': '',
    '처리자(총무)': viewer?.['성명'] ?? '',
    비고: '',
  });

  revalidatePath('/staff');
}

export async function updateStaffAction(formData: FormData) {
  const originalEmail = String(formData.get('originalEmail') ?? '');
  const staffPayload = staffPayloadFromForm(formData);
  await updateStaff(originalEmail, staffPayload);
  revalidatePath('/staff');
}

export async function deleteStaffAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  await deleteStaff(email);
  revalidatePath('/staff');
}
