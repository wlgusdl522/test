import { Fragment } from 'react';
import { buildWorklogItems, getWorklogBusinessNames } from '@/lib/mutate/businessPlan';
import { getDailyEntries, rangeSum } from '@/lib/mutate/worklogEntry';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import { badgeBase, badgeTone, btnSecondary, card, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');
const fpct = (v: number | null) => (v === null ? '–' : v >= 100 ? v.toFixed(0) : v.toFixed(1));
const pct = (v: number, g: number) => (g > 0 ? (v / g) * 100 : null);

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function PctBadge({ value, goal }: { value: number; goal: number }) {
  const p = pct(value, goal);
  if (p === null) return <span className="text-xs text-zinc-400">–</span>;
  const tone = p >= 100 ? badgeTone.green : p >= 50 ? badgeTone.amber : badgeTone.gray;
  return <span className={`${badgeBase} ${tone}`}>{fpct(p)}%</span>;
}

export default async function BusinessSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  if (!(await hasPageAccess('business-summary'))) return <PageAccessDenied />;

  const { from: fromParam, to: toParam } = await searchParams;
  const today = todayKst();
  const from = fromParam || `${today.slice(0, 7)}-01`;
  const to = toParam || today;

  const businesses = await getWorklogBusinessNames();
  const perBusiness = await Promise.all(
    businesses.map(async (business) => {
      const [items, entries] = await Promise.all([buildWorklogItems(business), getDailyEntries(business)]);
      const groups = new Map<string, typeof items>();
      items.forEach((i) => {
        if (!groups.has(i.세부사업명)) groups.set(i.세부사업명, []);
        groups.get(i.세부사업명)!.push(i);
      });
      const subRows = [...groups.entries()].map(([세부사업명, groupItems]) => {
        const ids = groupItems.map((i) => i.id);
        const [실적건, 실적명] = rangeSum(entries, ids, from, to);
        return {
          세부사업명,
          목표건: groupItems.reduce((a, i) => a + i.목표건, 0),
          목표명: groupItems.reduce((a, i) => a + i.목표명, 0),
          실적건, 실적명,
        };
      });
      return {
        business,
        subRows,
        goalC: subRows.reduce((a, r) => a + r.목표건, 0),
        goalP: subRows.reduce((a, r) => a + r.목표명, 0),
        actC: subRows.reduce((a, r) => a + r.실적건, 0),
        actP: subRows.reduce((a, r) => a + r.실적명, 0),
      };
    })
  );

  const grandGoalC = perBusiness.reduce((a, b) => a + b.goalC, 0);
  const grandGoalP = perBusiness.reduce((a, b) => a + b.goalP, 0);
  const grandActC = perBusiness.reduce((a, b) => a + b.actC, 0);
  const grandActP = perBusiness.reduce((a, b) => a + b.actP, 0);

  return (
    <div>
      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">기간</label>
        <input type="date" name="from" defaultValue={from} className={`${inputBase} w-auto`} />
        <span className="text-zinc-400">~</span>
        <input type="date" name="to" defaultValue={to} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <div className={card}>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th} rowSpan={2}>사업</th>
                <th className={th} rowSpan={2}>세부사업</th>
                <th className={th} colSpan={2}>연간목표</th>
                <th className={th} colSpan={2}>기간실적</th>
                <th className={th} colSpan={2}>달성율</th>
              </tr>
              <tr>
                <th className={th}>건</th><th className={th}>명</th>
                <th className={th}>건</th><th className={th}>명</th>
                <th className={th}>건</th><th className={th}>명</th>
              </tr>
            </thead>
            <tbody>
              {perBusiness.map((b) => (
                <Fragment key={b.business}>
                  {b.subRows.length === 0 ? (
                    <tr>
                      <td className={`${td} font-medium`}>{b.business}</td>
                      <td className={`${td} text-left text-zinc-400`} colSpan={7}>등록된 계획 없음</td>
                    </tr>
                  ) : (
                    b.subRows.map((r, i) => (
                      <tr key={r.세부사업명}>
                        {i === 0 && (
                          <td className={`${td} font-medium`} rowSpan={b.subRows.length}>{b.business}</td>
                        )}
                        <td className={`${td} text-left`}>{r.세부사업명}</td>
                        <td className={`${td} text-zinc-400`}>{nf(r.목표건)}</td>
                        <td className={`${td} text-zinc-400`}>{nf(r.목표명)}</td>
                        <td className={td}>{nf(r.실적건)}</td><td className={td}>{nf(r.실적명)}</td>
                        <td className={td}><PctBadge value={r.실적건} goal={r.목표건} /></td>
                        <td className={td}><PctBadge value={r.실적명} goal={r.목표명} /></td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                    <td className={td} colSpan={2}>소계 · {b.business}</td>
                    <td className={td}>{nf(b.goalC)}</td><td className={td}>{nf(b.goalP)}</td>
                    <td className={td}>{nf(b.actC)}</td><td className={td}>{nf(b.actP)}</td>
                    <td className={td}><PctBadge value={b.actC} goal={b.goalC} /></td>
                    <td className={td}><PctBadge value={b.actP} goal={b.goalP} /></td>
                  </tr>
                </Fragment>
              ))}
              <tr className="bg-brand-dark font-semibold text-white">
                <td className={`${td} !text-white`} colSpan={2}>총 계</td>
                <td className={`${td} !text-white`}>{nf(grandGoalC)}</td><td className={`${td} !text-white`}>{nf(grandGoalP)}</td>
                <td className={`${td} !text-white`}>{nf(grandActC)}</td><td className={`${td} !text-white`}>{nf(grandActP)}</td>
                <td className={`${td} !text-white`}>{fpct(pct(grandActC, grandGoalC))}%</td>
                <td className={`${td} !text-white`}>{fpct(pct(grandActP, grandGoalP))}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
