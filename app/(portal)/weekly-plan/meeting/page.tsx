import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getMeetingMeta } from '@/lib/mutate/meeting';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { summarizeLeaveEntries } from '@/lib/weeklyLeave';
import { btn, btnSecondary, card, h1, h2, input, inputBase, label, page } from '@/lib/ui';
import WeeklyPlanTabs from '@/components/weekly/WeeklyPlanTabs';
import { saveMeetingMetaAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 같은 사람이 같은 업무를 여러 날 체크했으면 한 줄로 합쳐서 "업무내용(7/27, 7/29)"로 보여준다.
function groupHighlighted(tasks: Record<string, string>[]): { name: string; label: string }[] {
  const map = new Map<string, { name: string; text: string; dates: string[] }>();
  for (const t of tasks) {
    const key = `${t.성명}::${t.업무내용}`;
    if (!map.has(key)) map.set(key, { name: t.성명, text: t.업무내용, dates: [] });
    map.get(key)!.dates.push(t.날짜);
  }
  return Array.from(map.values()).map(({ name, text, dates }) => {
    const dateLabel = [...dates].sort().map(formatMD).join(', ');
    return { name, label: `${text}(${dateLabel})` };
  });
}

export default async function MeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; date?: string }>;
}) {
  const params = await searchParams;
  const me = await getViewerStaffRecord();
  const teams = await getSimpleList(TEAM_LIST_SHEET_NAME);
  const team = params.team ?? me?.소속팀 ?? teams[0] ?? '';
  const date = params.date ?? mondayOf(new Date());

  const [meta, weekStart] = [await getMeetingMeta(team, date), mondayOf(new Date(date))];
  const weekTasks = await getWeeklyTasks(team, weekStart);
  const highlightedTasks = weekTasks.filter((t) => t.회의록후보 === 'TRUE' || t.회의록후보 === 'true');
  const leaveSuggestion = summarizeLeaveEntries(weekTasks);

  return (
    <main className={page}>
      <h1 className={h1}>회의록 정리</h1>

      <WeeklyPlanTabs active="/weekly-plan/meeting" />

      <form method="get" className="flex gap-2 mb-6">
        <select name="team" defaultValue={team} className={`${inputBase} w-auto`}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="date" defaultValue={date} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <h2 className={h2}>이번 주 회의록 반영 업무</h2>
      {highlightedTasks.length === 0 ? (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">체크된 업무가 없습니다.</p>
      ) : (
        <ul className="mb-6 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {groupHighlighted(highlightedTasks).map((g, i) => (
            <li key={i}><b>{g.name}</b>: {g.label}</li>
          ))}
        </ul>
      )}

      <form action={saveMeetingMetaAction} className={`${card} flex flex-col gap-3`}>
        <input type="hidden" name="team" value={team} />
        <input type="hidden" name="date" value={date} />
        <label className={label}>
          회의시간
          <input type="time" name="time" defaultValue={meta?.회의시간 ?? ''} className={input} />
        </label>
        <label className={label}>
          회의장소
          <input name="place" defaultValue={meta?.회의장소 ?? ''} className={input} />
        </label>
        <label className={label}>
          공지사항
          <textarea name="notice" defaultValue={meta?.공지사항 ?? ''} className={input} />
        </label>
        <label className={label}>
          휴가 및 일정
          <textarea name="leave" defaultValue={meta?.휴가및일정 || leaveSuggestion} className={input} />
        </label>
        <label className={label}>
          슈퍼비전
          <textarea name="supervision" defaultValue={meta?.슈퍼비전 ?? ''} className={input} />
        </label>
        <div>
          <button type="submit" className={btn}>저장</button>
        </div>
      </form>
    </main>
  );
}
