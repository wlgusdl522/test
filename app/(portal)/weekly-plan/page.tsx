import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { btn, btnDanger, btnSecondary, h1, input, pageWide, table, td, th } from '@/lib/ui';
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
    <main className={pageWide}>
      <h1 className={h1}>주간업무계획</h1>

      <form method="get" className="flex gap-2 mb-3">
        <select name="team" defaultValue={team} className={`${input} w-auto`}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="weekStart" defaultValue={weekStart} className={`${input} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <form action={addWeeklyTaskAction} className="flex gap-2 mb-6">
        <input type="date" name="date" required defaultValue={weekStart} className={`${input} w-auto`} />
        <input name="content" placeholder="업무내용" required className={input} />
        <button type="submit" className={btn}>추가</button>
      </form>

      <table className={table}>
        <thead>
          <tr>
            <th className={th}>날짜</th><th className={th}>성명</th><th className={th}>업무내용</th>
            <th className={th}>회의록후보</th><th className={th}>부서장반영</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const highlighted = t.회의록후보 === 'TRUE' || t.회의록후보 === 'true';
            const reflected = t.부서장반영 === 'TRUE' || t.부서장반영 === 'true';
            return (
              <tr key={t.id}>
                <td className={td}>{t.날짜}</td>
                <td className={td}>{t.성명}</td>
                <td className={td}>{t.업무내용}</td>
                <td className={td}>
                  <form action={toggleHighlightAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="flag" value={String(!highlighted)} />
                    <button type="submit">{highlighted ? '✅' : '☐'}</button>
                  </form>
                </td>
                <td className={td}>
                  <form action={toggleSupervisorReflectAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="flag" value={String(!reflected)} />
                    <button type="submit">{reflected ? '✅' : '☐'}</button>
                  </form>
                </td>
                <td className={td}>
                  <form action={deleteWeeklyTaskAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className={btnDanger}>삭제</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-6 text-sm text-zinc-500 flex gap-3">
        <a href="/weekly-plan/meeting" className="hover:underline">회의록 정리</a>
        <a href="/weekly-plan/review" className="hover:underline">부서장 확인</a>
      </p>
    </main>
  );
}
