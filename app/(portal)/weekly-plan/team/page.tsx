import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getStaffList } from '@/lib/mutate/staff';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { btn, btnSecondary, h1, inputBase, page, table, td, th, tableWrap } from '@/lib/ui';
import WeeklyPlanTabs from '@/components/weekly/WeeklyPlanTabs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토'];

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function WeeklyPlanTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; weekStart?: string }>;
}) {
  const params = await searchParams;
  const [me, teams, staffList] = await Promise.all([
    getViewerStaffRecord(),
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getStaffList(),
  ]);
  const team = params.team ?? me?.소속팀 ?? teams[0] ?? '';
  const weekStart = params.weekStart ?? mondayOf(new Date());
  const viewerEmail = (me?.['이메일(아이디)'] ?? '').toLowerCase();

  const tasks = await getWeeklyTasks(team, weekStart);
  const roster = staffList.filter((s) => s['소속팀'] === team && s['재직상태'] !== '퇴사');

  const monday = new Date(`${weekStart}T00:00:00`);
  const dayDates: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dayDates.push(d.toISOString().slice(0, 10));
  }

  return (
    <main className={page}>
      <h1 className={h1}>전체보기</h1>

      <WeeklyPlanTabs active="/weekly-plan/team" />

      <form method="get" className="flex gap-2 mb-6">
        <select name="team" defaultValue={team} className={`${inputBase} w-auto`}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="weekStart" defaultValue={weekStart} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
        <a
          href={`/print/weekly-plan-team?team=${encodeURIComponent(team)}&weekStart=${weekStart}`}
          target="_blank"
          className={`${btn} ml-auto`}
        >
          인쇄
        </a>
      </form>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>담당자</th>
              {dayDates.map((iso, i) => {
                const d = new Date(`${iso}T00:00:00`);
                return <th key={iso} className={th}>{WEEKDAY_LABELS[i]} ({d.getMonth() + 1}/{d.getDate()})</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr><td className={td} colSpan={7} style={{ textAlign: 'center' }}>해당 팀에 재직 중인 직원이 없습니다.</td></tr>
            ) : roster.map((r) => {
              const email = r['이메일(아이디)'];
              const isMe = email.toLowerCase() === viewerEmail;
              return (
                <tr key={email} className={isMe ? 'bg-brand-tint' : undefined}>
                  <td className={td}>
                    <b>{r['성명']}</b>
                  </td>
                  {dayDates.map((iso) => {
                    const dayTasks = tasks.filter((t) => t['이메일(아이디)'] === email && t['날짜'] === iso);
                    return (
                      <td key={iso} className={td}>
                        {dayTasks.length === 0
                          ? <span className="text-zinc-300 dark:text-zinc-700">-</span>
                          : dayTasks.map((t, i) => <div key={i}>• {t['업무내용']}</div>)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-400">내 줄은 배경색으로 강조돼요.</p>
    </main>
  );
}
