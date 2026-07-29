import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function WeeklyPlanTeamPrintPage({
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
    <div>
      <form method="get" className="mb-6 print:hidden">
        <select name="team" defaultValue={team}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="weekStart" defaultValue={weekStart} />
        <button type="submit">조회</button>
      </form>

      <h2 style={{ textAlign: 'center' }}>{team} 주간업무계획</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>{weekStart} 주</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>날짜</th><th>성명</th><th>업무내용</th></tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>{t.날짜}</td>
              <td>{t.성명}</td>
              <td>{t.업무내용}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
