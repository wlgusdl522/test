import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getMeetingMeta } from '@/lib/mutate/meeting';
import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
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
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>회의록 정리</h1>

      <form method="get" style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <select name="team" defaultValue={team} style={{ padding: 6 }}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" name="date" defaultValue={date} style={{ padding: 6 }} />
        <button type="submit">조회</button>
      </form>

      <h2 style={{ fontSize: 15 }}>이번 주 회의록후보 업무</h2>
      <ul>
        {highlightedTasks.map((t) => <li key={t.id}>{t.날짜} — {t.성명}: {t.업무내용}</li>)}
      </ul>

      <form action={saveMeetingMetaAction} style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0', border: '1px solid #ddd', padding: 16 }}>
        <input type="hidden" name="team" value={team} />
        <input type="hidden" name="date" value={date} />
        <label>
          회의시간
          <input type="time" name="time" defaultValue={meta?.회의시간 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          회의장소
          <input name="place" defaultValue={meta?.회의장소 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          공지사항
          <textarea name="notice" defaultValue={meta?.공지사항 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          휴가 및 일정
          <textarea name="leave" defaultValue={meta?.휴가및일정 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          슈퍼비전
          <textarea name="supervision" defaultValue={meta?.슈퍼비전 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <div>
          <button type="submit">저장</button>
        </div>
      </form>
    </main>
  );
}
