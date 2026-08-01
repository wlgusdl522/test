import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getReviewCompletionStatus } from '@/lib/mutate/reviewStatus';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { btnSecondary, card, h1, h2, inputBase, pageWide } from '@/lib/ui';
import WeeklyPlanTabs from '@/components/weekly/WeeklyPlanTabs';
import SupervisorReviewList from '@/components/weekly/SupervisorReviewList';
import PrinterIcon from '@/components/icons/PrinterIcon';
import PageAccessDenied from '@/components/PageAccessDenied';
import { setReviewCompletionAction } from './actions';

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

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string; team?: string }>;
}) {
  const params = await searchParams;
  const weekStart = params.weekStart ?? mondayOf(new Date());
  const [teams, status, me] = await Promise.all([
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getReviewCompletionStatus(weekStart),
    getViewerStaffRecord(),
  ]);
  const reviewTeam = params.team ?? me?.소속팀 ?? teams[0] ?? '';

  if (!(await hasPageAccess('weekly-plan-review'))) {
    return (
      <main className={pageWide}>
        <h1 className={h1}>부서장 확인</h1>
        <WeeklyPlanTabs active="/weekly-plan/review" />
        <PageAccessDenied />
      </main>
    );
  }

  const reviewTasks = await getWeeklyTasks(reviewTeam, weekStart);

  const monday = new Date(`${weekStart}T00:00:00`);
  const dayDates: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dayDates.push(d.toISOString().slice(0, 10));
  }

  return (
    <main className={pageWide}>
      <div className="flex items-center justify-between">
        <h1 className={h1}>부서장 확인</h1>
        <a href={`/print/weekly-plan-rollup?weekStart=${weekStart}`} target="_blank" className={btnSecondary}>
          <PrinterIcon />
          부서별 취합 인쇄
        </a>
      </div>

      <WeeklyPlanTabs active="/weekly-plan/review" />

      <form method="get" className="flex gap-2 mb-4">
        <select name="team" defaultValue={reviewTeam} className={`${inputBase} w-auto`}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="weekStart" defaultValue={weekStart} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <div className="print:hidden flex flex-wrap items-center gap-1.5 mb-5">
        {teams.map((team) => {
          const done = status[team]?.완료여부 ?? false;
          const active = team === reviewTeam;
          return (
            <a
              key={team}
              href={`/weekly-plan/review?team=${encodeURIComponent(team)}&weekStart=${weekStart}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${
                active ? 'border-brand ring-1 ring-brand' : 'border-transparent'
              } ${
                done
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              <span className="font-semibold">{team}</span>
              <span>{done ? '✓ 완료' : '미완료'}</span>
            </a>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className={h2}>{reviewTeam} 팀별 주간업무 확인</h2>
        {status[reviewTeam]?.완료여부 && (
          <form action={setReviewCompletionAction} className="print:hidden">
            <input type="hidden" name="team" value={reviewTeam} />
            <input type="hidden" name="weekStart" value={weekStart} />
            <input type="hidden" name="flag" value="false" />
            <button type="submit" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline">
              완료 취소 ({status[reviewTeam]?.확인자명} 확인)
            </button>
          </form>
        )}
      </div>
      <div className={`${card} mb-3`}>
        <SupervisorReviewList
          tasks={reviewTasks.map((t) => ({
            id: t.id,
            날짜: t.날짜,
            성명: t.성명,
            업무내용: t.업무내용,
            highlighted: t.회의록후보 === 'TRUE' || t.회의록후보 === 'true',
            reflected: t.부서장반영 === 'TRUE' || t.부서장반영 === 'true',
          }))}
          dayDates={dayDates}
          weekdayLabels={WEEKDAY_LABELS}
          team={reviewTeam}
          weekStart={weekStart}
        />
      </div>
    </main>
  );
}
