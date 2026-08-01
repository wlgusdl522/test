import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getStaffList } from '@/lib/mutate/staff';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { btnSecondary, card, h1, inputBase, pageWide } from '@/lib/ui';
import WeeklyPlanWorkspace from '@/components/weekly/WeeklyPlanWorkspace';
import WeeklyPlanTabs from '@/components/weekly/WeeklyPlanTabs';
import PrinterIcon from '@/components/icons/PrinterIcon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토'];
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0(일)~6(토)
  const diff = day === 0 ? -6 : 1 - day; // 이번 주 월요일까지 며칠 이동
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_KO[d.getDay()]})`;
}

export default async function WeeklyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const params = await searchParams;
  const me = await getViewerStaffRecord();
  const team = me?.소속팀 ?? '';
  const weekStart = params.weekStart ?? mondayOf(new Date());
  const viewerEmail = (me?.['이메일(아이디)'] ?? '').toLowerCase();

  const [teamTasks, staffList] = await Promise.all([getWeeklyTasks(team, weekStart), getStaffList()]);
  const myTasks = teamTasks.filter((t) => (t['이메일(아이디)'] ?? '').toLowerCase() === viewerEmail);
  const roster = staffList
    .filter((s) => s['소속팀'] === team && s['재직상태'] !== '퇴사')
    .map((s) => ({ email: s['이메일(아이디)'], name: s['성명'] }));

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
        <h1 className={h1}>주간업무계획</h1>
        <a href={`/print/weekly-plan-team?team=${encodeURIComponent(team)}&weekStart=${weekStart}`} target="_blank" className={btnSecondary}>
          <PrinterIcon />
          인쇄
        </a>
      </div>

      <WeeklyPlanTabs active="/weekly-plan" />

      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{team}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{me?.성명 ?? ''}</span>
          <span className="text-xs text-zinc-400 ml-auto">{formatDayLabel(dayDates[0])} ~ {formatDayLabel(dayDates[5])}</span>
        </div>
        <form method="get" className="flex items-center gap-2 mb-1">
          <input type="date" name="weekStart" defaultValue={weekStart} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>

        <WeeklyPlanWorkspace
          dayDates={dayDates}
          weekdayLabels={WEEKDAY_LABELS}
          initialTasks={myTasks.map((t) => ({ id: t.id, 날짜: t.날짜, 업무내용: t.업무내용, 회의록후보: t.회의록후보 }))}
          myName={me?.성명 ?? ''}
          myEmail={viewerEmail}
          roster={roster}
          teamTasks={teamTasks.map((t) => ({
            email: t['이메일(아이디)'] ?? '',
            name: t['성명'] ?? '',
            날짜: t['날짜'],
            업무내용: t['업무내용'],
          }))}
        />
      </div>
    </main>
  );
}
