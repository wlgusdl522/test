import { getMyWeeklyTaskHistory, getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { btnSecondary, h1, h2, inputBase, pageWide, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import StatusBadge from '@/components/StatusBadge';
import WeeklyTaskCalendar from '@/components/weekly/WeeklyTaskCalendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토'];

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
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const params = await searchParams;
  const me = await getViewerStaffRecord();
  const team = me?.소속팀 ?? '';
  const weekStart = params.weekStart ?? mondayOf(new Date());
  const viewerEmail = (me?.['이메일(아이디)'] ?? '').toLowerCase();

  const teamTasks = await getWeeklyTasks(team, weekStart);
  const myTasks = teamTasks.filter((t) => (t['이메일(아이디)'] ?? '').toLowerCase() === viewerEmail);
  const history = viewerEmail ? await getMyWeeklyTaskHistory(viewerEmail) : [];

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
        <h1 className={h1}>주간업무계획 (내 업무 입력)</h1>
        <a href={`/print/weekly-plan-team?team=${encodeURIComponent(team)}&weekStart=${weekStart}`} target="_blank" className="text-sm text-brand hover:underline">인쇄</a>
      </div>

      <form method="get" className="flex items-center gap-2 mb-4">
        <input type="date" name="weekStart" defaultValue={weekStart} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <WeeklyTaskCalendar
        dayDates={dayDates}
        weekdayLabels={WEEKDAY_LABELS}
        initialTasks={myTasks.map((t) => ({ id: t.id, 날짜: t.날짜, 업무내용: t.업무내용, 회의록후보: t.회의록후보 }))}
        myName={me?.성명 ?? ''}
      />

      <p className="mt-6 mb-2 text-sm text-zinc-500 flex gap-3">
        <a href="/weekly-plan/meeting" className="hover:underline">회의록 정리</a>
        <a href="/weekly-plan/review" className="hover:underline">부서장 확인</a>
      </p>

      <h2 className={h2}>지난 기록 (최근 {history.length}건)</h2>
      <div className={tableWrap}><table className={table}>
        <thead>
          <tr><th className={th}>날짜</th><th className={th}>업무내용</th><th className={th}>회의록후보</th></tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr><td className={td} colSpan={3} style={{ textAlign: 'center' }}>등록된 업무 이력이 없습니다.</td></tr>
          ) : history.map((t) => (
            <tr key={t.id} className={trZebraHover}>
              <td className={td}>{t.날짜}</td>
              <td className={td}>{t.업무내용}</td>
              <td className={td}>{(t.회의록후보 === 'TRUE' || t.회의록후보 === 'true') && <StatusBadge status="완료" />}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </main>
  );
}
