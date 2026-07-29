import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getReviewCompletionStatus } from '@/lib/mutate/reviewStatus';
import { btn, btnSecondary, h1, input, page, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import StatusBadge from '@/components/StatusBadge';
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
    <main className={page}>
      <div className="flex items-center justify-between">
        <h1 className={h1}>부서장 확인</h1>
        <a href={`/print/weekly-plan-rollup?weekStart=${weekStart}`} target="_blank" className="text-sm text-brand hover:underline">부서별 취합 인쇄</a>
      </div>

      <form method="get" className="flex gap-2 mb-6">
        <input type="date" name="weekStart" defaultValue={weekStart} className={`${input} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr><th className={th}>팀</th><th className={th}>완료여부</th><th className={th}>확인자</th><th className={th}>확인일시</th><th className={th}></th></tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const s = status[team];
            const done = s?.완료여부 ?? false;
            return (
              <tr key={team} className={trZebraHover}>
                <td className={td}>{team}</td>
                <td className={td}><StatusBadge status={done ? '완료' : '미완료'} /></td>
                <td className={td}>{s?.확인자명 ?? ''}</td>
                <td className={td}>{s?.확인일시 ?? ''}</td>
                <td className={td}>
                  <form action={setReviewCompletionAction}>
                    <input type="hidden" name="team" value={team} />
                    <input type="hidden" name="weekStart" value={weekStart} />
                    <input type="hidden" name="flag" value={String(!done)} />
                    <button type="submit" className={btn}>{done ? '완료 취소' : '완료 처리'}</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </main>
  );
}
