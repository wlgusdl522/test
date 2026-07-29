import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getReviewCompletionStatus } from '@/lib/mutate/reviewStatus';
import { setReviewCompletionAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const params = await searchParams;
  const weekStart = params.weekStart ?? mondayOf(new Date());
  const [teams, status] = await Promise.all([
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getReviewCompletionStatus(weekStart),
  ]);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h1>부서장 확인</h1>

      <form method="get" style={{ margin: '16px 0' }}>
        <input type="date" name="weekStart" defaultValue={weekStart} style={{ padding: 6 }} />
        <button type="submit">조회</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}><th>팀</th><th>완료여부</th><th>확인자</th><th>확인일시</th><th></th></tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const s = status[team];
            const done = s?.완료여부 ?? false;
            return (
              <tr key={team}>
                <td>{team}</td>
                <td>{done ? '완료' : '미완료'}</td>
                <td>{s?.확인자명 ?? ''}</td>
                <td>{s?.확인일시 ?? ''}</td>
                <td>
                  <form action={setReviewCompletionAction}>
                    <input type="hidden" name="team" value={team} />
                    <input type="hidden" name="weekStart" value={weekStart} />
                    <input type="hidden" name="flag" value={String(!done)} />
                    <button type="submit">{done ? '완료 취소' : '완료 처리'}</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
