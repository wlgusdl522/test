import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import {
  addWeeklyTaskAction,
  deleteWeeklyTaskAction,
  toggleHighlightAction,
  toggleSupervisorReflectAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0(일)~6(토)
  const diff = day === 0 ? -6 : 1 - day; // 이번 주 월요일까지 며칠 이동
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function WeeklyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; weekStart?: string }>;
}) {
  const params = await searchParams;
  const me = await getViewerStaffRecord();
  const teams = await getSimpleList(TEAM_LIST_SHEET_NAME);
  const team = params.team ?? me?.소속팀 ?? teams[0] ?? '';
  const weekStart = params.weekStart ?? mondayOf(new Date());

  const tasks = await getWeeklyTasks(team, weekStart);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>주간업무계획</h1>

      <form method="get" style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <select name="team" defaultValue={team} style={{ padding: 6 }}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="weekStart" defaultValue={weekStart} style={{ padding: 6 }} />
        <button type="submit">조회</button>
      </form>

      <form action={addWeeklyTaskAction} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input type="date" name="date" required defaultValue={weekStart} style={{ padding: 6 }} />
        <input name="content" placeholder="업무내용" required style={{ flex: 1, padding: 6 }} />
        <button type="submit">추가</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>날짜</th><th>성명</th><th>업무내용</th><th>회의록후보</th><th>부서장반영</th><th></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>{t.날짜}</td>
              <td>{t.성명}</td>
              <td>{t.업무내용}</td>
              <td>
                <form action={toggleHighlightAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="flag" value={String(t.회의록후보 !== 'TRUE' && t.회의록후보 !== 'true')} />
                  <button type="submit">{t.회의록후보 === 'TRUE' || t.회의록후보 === 'true' ? '✅' : '☐'}</button>
                </form>
              </td>
              <td>
                <form action={toggleSupervisorReflectAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="flag" value={String(t.부서장반영 !== 'TRUE' && t.부서장반영 !== 'true')} />
                  <button type="submit">{t.부서장반영 === 'TRUE' || t.부서장반영 === 'true' ? '✅' : '☐'}</button>
                </form>
              </td>
              <td>
                <form action={deleteWeeklyTaskAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit">삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 24 }}>
        <a href="/weekly-plan/meeting">회의록 정리</a> · <a href="/weekly-plan/review">부서장 확인</a>
      </p>
    </main>
  );
}
