import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList } from '@/lib/mutate/keyedTable';
import { getSheetsClient } from '@/lib/sheets/client';
import { WEEKLY_TASK_TABLE } from '@/lib/sheets/registry';
import { mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';
import { requireCanToggleTask, requireIsSupervisorForTeam } from '@/lib/auth-helpers';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// weekStart(월요일, 'yyyy-MM-dd')가 속한 월~토(6일) 범위의 업무만 돌려준다.
export async function getWeeklyTasks(team: string | null, weekStart: string): Promise<Record<string, string>[]> {
  const all = await getKeyedList(WEEKLY_TASK_TABLE);

  const start = new Date(`${weekStart}T00:00:00`);
  const validDates = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    validDates.add(d.toISOString().slice(0, 10));
  }

  return all
    .filter((r) => {
      if (team && r['소속팀'] !== team) return false;
      return validDates.has(r['날짜']);
    })
    .sort((a, b) => (a['날짜'] < b['날짜'] ? -1 : a['날짜'] > b['날짜'] ? 1 : 0));
}

export async function addWeeklyTask(payload: Record<string, string>): Promise<Record<string, string>[]> {
  if (!payload['날짜'] || !payload['업무내용']) {
    throw new Error('날짜와 업무내용은 필수입니다.');
  }
  const record: Record<string, string> = {
    id: randomUUID(),
    '이메일(아이디)': payload['이메일(아이디)'] ?? '',
    성명: payload['성명'] ?? '',
    소속팀: payload['소속팀'] ?? '',
    날짜: payload['날짜'],
    업무내용: payload['업무내용'],
    회의록후보: 'FALSE',
    부서장반영: 'FALSE',
    등록일시: nowTimestamp(),
  };
  return addKeyedRecord(WEEKLY_TASK_TABLE, record);
}

export async function deleteWeeklyTask(id: string): Promise<Record<string, string>[]> {
  const existing = (await getKeyedList(WEEKLY_TASK_TABLE)).find((r) => r.id === id);
  if (!existing) return getKeyedList(WEEKLY_TASK_TABLE); // 멱등 삭제 — 이미 없으면 조용히 성공 처리
  return deleteKeyedRecord(WEEKLY_TASK_TABLE, { id });
}

async function setSingleCell(id: string, column: string, value: boolean): Promise<void> {
  const colIndex = WEEKLY_TASK_TABLE.headers.indexOf(column);
  const all = await getKeyedList(WEEKLY_TASK_TABLE);
  const rowOffset = all.findIndex((r) => r.id === id);
  if (rowOffset === -1) throw new Error('해당 업무를 찾을 수 없습니다.');

  // getKeyedList는 Supabase 우선이라 실제 시트 행 위치를 다시 조회해야 한다.
  const res = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId: WEEKLY_TASK_TABLE.spreadsheetId,
    range: `${WEEKLY_TASK_TABLE.sheetName}!A3:A`,
  });
  const ids = (res.data.values ?? []).map((row) => row[0]);
  const sheetRowOffset = ids.indexOf(id);
  if (sheetRowOffset === -1) throw new Error('해당 업무를 찾을 수 없습니다.');
  const rowNumber = 3 + sheetRowOffset;
  const colLetter = String.fromCharCode(65 + colIndex);

  await getSheetsClient().spreadsheets.values.update({
    spreadsheetId: WEEKLY_TASK_TABLE.spreadsheetId,
    range: `${WEEKLY_TASK_TABLE.sheetName}!${colLetter}${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });

  const all2 = await getKeyedList(WEEKLY_TASK_TABLE);
  await mirrorKeyedTableToSupabase({ tableName: WEEKLY_TASK_TABLE.sheetName, primaryKey: WEEKLY_TASK_TABLE.primaryKey }, all2);
}

// 작성자 본인이 "내 업무 입력"에서 체크 — 체크 즉시 그 팀의 회의록에 자동 반영.
export async function toggleTaskHighlight(id: string, flag: boolean): Promise<void> {
  const all = await getKeyedList(WEEKLY_TASK_TABLE);
  const task = all.find((r) => r.id === id);
  if (!task) throw new Error('해당 업무를 찾을 수 없습니다.');
  await requireCanToggleTask(task['이메일(아이디)'], task['소속팀']);
  await setSingleCell(id, '회의록후보', flag);
}

// 부서장이 "부서장 확인"에서 상위 회의에 올릴 항목을 고르는 값 — 본인 업무 예외 없음.
export async function toggleSupervisorReflect(id: string, flag: boolean): Promise<void> {
  const all = await getKeyedList(WEEKLY_TASK_TABLE);
  const task = all.find((r) => r.id === id);
  if (!task) throw new Error('해당 업무를 찾을 수 없습니다.');
  await requireIsSupervisorForTeam(task['소속팀']);
  await setSingleCell(id, '부서장반영', flag);
}
