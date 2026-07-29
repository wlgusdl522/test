import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getMeetingMeta } from '@/lib/mutate/meeting';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { btn, btnSecondary, card, h1, h2, input, label, page } from '@/lib/ui';
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
  const highlightedTasks = (await getWeeklyTasks(team, weekStart)).filter(
    (t) => t.회의록후보 === 'TRUE' || t.회의록후보 === 'true'
  );

  return (
    <main className={page}>
      <h1 className={h1}>회의록 정리</h1>

      <form method="get" className="flex gap-2 mb-6">
        <select name="team" defaultValue={team} className={`${input} w-auto`}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="date" defaultValue={date} className={`${input} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <h2 className={h2}>이번 주 회의록후보 업무</h2>
      <ul className="mb-6 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {highlightedTasks.map((t) => <li key={t.id}>{t.날짜} — {t.성명}: {t.업무내용}</li>)}
      </ul>

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
          <textarea name="leave" defaultValue={meta?.휴가및일정 ?? ''} className={input} />
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
