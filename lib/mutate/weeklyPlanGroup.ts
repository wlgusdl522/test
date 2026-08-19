import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList } from '@/lib/mutate/keyedTable';
import { WEEKLY_TASK_GROUP_TABLE } from '@/lib/sheets/registry';
import type { WeeklyPlanGroupRow } from '@/lib/weeklyPlanGroup';

export type WeeklyPlanGroupMember = WeeklyPlanGroupRow & { id: string; 소속팀: string };

export async function getWeeklyPlanGroups(team: string): Promise<WeeklyPlanGroupMember[]> {
  const rows = (await getKeyedList(WEEKLY_TASK_GROUP_TABLE)) as WeeklyPlanGroupMember[];
  return rows
    .filter((r) => r.소속팀 === team)
    .sort((a, b) => (Number(a.정렬순서) || 0) - (Number(b.정렬순서) || 0));
}

export async function addWeeklyPlanGroupMember(
  team: string,
  groupName: string,
  email: string,
  name: string
): Promise<void> {
  const trimmedGroup = groupName.trim();
  if (!team || !trimmedGroup || !email) throw new Error('소속팀/그룹명/직원은 필수입니다.');
  const current = await getWeeklyPlanGroups(team);
  if (current.some((r) => r.그룹명 === trimmedGroup && r.이메일.toLowerCase() === email.toLowerCase())) {
    throw new Error('이미 해당 그룹에 등록된 직원입니다.');
  }
  const sameGroup = current.filter((r) => r.그룹명 === trimmedGroup);
  const next정렬순서 = sameGroup.length ? Math.max(...sameGroup.map((r) => Number(r.정렬순서) || 0)) + 1 : 1;
  await addKeyedRecord(WEEKLY_TASK_GROUP_TABLE, {
    id: randomUUID(),
    소속팀: team,
    그룹명: trimmedGroup,
    이메일: email,
    성명: name,
    정렬순서: String(next정렬순서),
  });
}

export async function removeWeeklyPlanGroupMember(id: string): Promise<void> {
  await deleteKeyedRecord(WEEKLY_TASK_GROUP_TABLE, { id });
}
