import { buildWorklogItems, getWorklogBusinessNames } from '@/lib/mutate/businessPlan';
import { getDailyEntries, rangeSum } from '@/lib/mutate/worklogEntry';
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

export default async function BusinessSummaryBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const today = todayKst();
  const from = fromParam || `${today.slice(0, 7)}-01`;
  const to = toParam || today;

  const businesses = await getWorklogBusinessNames();
  const perBusiness = await Promise.all(
    businesses.map(async (business) => {
      const [items, entries] = await Promise.all([buildWorklogItems(business), getDailyEntries(business)]);
      const ids = items.map((i) => i.id);
      const [actC, actP] = rangeSum(entries, ids, from, to);
      return {
        business,
        goalC: items.reduce((a, i) => a + i.목표건, 0),
        goalP: items.reduce((a, i) => a + i.목표명, 0),
        actC, actP,
      };
    })
  );

  const grandGoalC = perBusiness.reduce((a, b) => a + b.goalC, 0);
  const grandGoalP = perBusiness.reduce((a, b) => a + b.goalP, 0);
  const grandActC = perBusiness.reduce((a, b) => a + b.actC, 0);
  const grandActP = perBusiness.reduce((a, b) => a + b.actP, 0);

  return (
    <>
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
                <tr key={b.business}>
                  <td className={`${td} text-left font-medium`}>{b.business}</td>
                  <td className={`${td} text-zinc-400`}>{nf(b.goalC)}</td>
                  <td className={`${td} text-zinc-400`}>{nf(b.goalP)}</td>
                  <td className={td}>{nf(b.actC)}</td><td className={td}>{nf(b.actP)}</td>
                  <td className={td}><PctBadge value={b.actC} goal={b.goalC} /></td>
                  <td className={td}><PctBadge value={b.actP} goal={b.goalP} /></td>
                </tr>
              ))}
              <tr className="bg-brand-dark font-semibold text-white">
                <td className={`${td} !text-white text-left`}>총 계</td>
                <td className={`${td} !text-white`}>{nf(grandGoalC)}</td><td className={`${td} !text-white`}>{nf(grandGoalP)}</td>
                <td className={`${td} !text-white`}>{nf(grandActC)}</td><td className={`${td} !text-white`}>{nf(grandActP)}</td>
                <td className={`${td} !text-white`}>{fpct(pct(grandActC, grandGoalC))}%</td>
                <td className={`${td} !text-white`}>{fpct(pct(grandActP, grandGoalP))}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
