import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList } from '@/lib/mutate/keyedTable';
import { getSheetsClient } from '@/lib/sheets/client';
import { WEEKLY_TASK_TABLE } from '@/lib/sheets/registry';
import { mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';
import { requireCanToggleTask, requireIsSupervisorForTeam } from '@/lib/auth-helpers';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// 아주 초기(2026-07-11) 몇 건이 "2026. 7. 7" 같은 한글 로케일 형식으로 남아있어 ISO 비교에서
// 항상 걸러졌다 — 값 자체는 안 고치고 읽을 때만 정규화해서 그런 오래된 행도 주별 보기에 나오게 한다.
function normalizeTaskDate(raw: string): string {
  const m = /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/.exec(raw || '');
  if (!m) return raw;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
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
    .map((r): Record<string, string> => ({ ...r, 날짜: normalizeTaskDate(r['날짜']) }))
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
    회의록후보: payload['회의록후보'] ?? 'FALSE',
    부서장반영: 'FALSE',
    등록일시: nowTimestamp(),
  };
  return addKeyedRecord(WEEKLY_TASK_TABLE, record);
}

// "작성" 탭의 배치 제출용 — 요일 칸 하나(이메일+날짜)를 화면에서 넘어온 (텍스트, 회의록 체크) 목록과
// diff한다. 텍스트가 그대로인 줄은 건드리지 않고 체크 상태만 필요하면 갱신하고, 없어진 텍스트는 삭제,
// 새로 생긴 텍스트는 체크 상태를 반영해서 추가한다 — 부서장반영 등 텍스트 불변 항목의 다른 플래그는 보존된다.
export async function submitWeeklyTaskDay(
  email: string,
  name: string,
  team: string,
  date: string,
  entries: { text: string; flagged: boolean }[]
): Promise<Record<string, string>[]> {
  const all = await getKeyedList(WEEKLY_TASK_TABLE);
  const existingForDay = all.filter((r) => r['이메일(아이디)'] === email && r['날짜'] === date);
  const remaining = [...existingForDay];
  const toAdd: { text: string; flagged: boolean }[] = [];
  const toFlagUpdate: { id: string; flagged: boolean }[] = [];

  for (const entry of entries) {
    const idx = remaining.findIndex((t) => t['업무내용'] === entry.text);
    if (idx > -1) {
      const [existing] = remaining.splice(idx, 1);
      const currentFlag = existing['회의록후보'] === 'TRUE' || existing['회의록후보'] === 'true';
      if (currentFlag !== entry.flagged) toFlagUpdate.push({ id: existing.id, flagged: entry.flagged });
    } else {
      toAdd.push(entry);
    }
  }

  for (const t of remaining) await deleteWeeklyTask(t.id);
  for (const entry of toAdd) {
    await addWeeklyTask({
      '이메일(아이디)': email,
      성명: name,
      소속팀: team,
      날짜: date,
      업무내용: entry.text,
      회의록후보: entry.flagged ? 'TRUE' : 'FALSE',
    });
  }
  for (const { id, flagged } of toFlagUpdate) await setSingleCell(id, '회의록후보', flagged);

  const updated = await getKeyedList(WEEKLY_TASK_TABLE);
  return updated.filter((r) => r['이메일(아이디)'] === email && r['날짜'] === date);
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
