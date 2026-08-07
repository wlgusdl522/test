import { buildWorklogItems, getViewerWorklogBusinessNames, sumWorklogGoal } from '@/lib/mutate/businessPlan';
import { getDailyEntries, getWrittenDates, rangeSum } from '@/lib/mutate/worklogEntry';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import { badgeBase, badgeTone, btnSecondary, card, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
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

function midSpan(rows: { 세부사업명: string; 중분류: string }[], i: number): number {
  const same = (a: { 세부사업명: string; 중분류: string }, b: { 세부사업명: string; 중분류: string }) =>
    a.세부사업명 === b.세부사업명 && a.중분류 === b.중분류;
  if (i > 0 && same(rows[i - 1], rows[i])) return 0;
  let n = 1;
  while (rows[i + n] && same(rows[i + n], rows[i])) n++;
  return n;
}

export default async function BusinessMonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; ym?: string }>;
}) {
  if (!(await hasPageAccess('business-monthly'))) return <PageAccessDenied />;

  const { business: businessParam, ym: ymParam } = await searchParams;
  const businesses = await getViewerWorklogBusinessNames();
  const business = businessParam || businesses[0] || '';
  if (!business || !businesses.includes(business)) {
    return <p className="text-sm text-zinc-500">공유받은 사업이 없습니다. 세부사업계획 화면에서 사업 담당자에게 공유를 요청해주세요.</p>;
  }
  const ym = ymParam || todayKst().slice(0, 7);
  const [y, m] = ym.split('-').map(Number);

  const [items, entries, writtenDates] = await Promise.all([
    buildWorklogItems(business),
    getDailyEntries(business),
    getWrittenDates(business),
  ]);
  const grandGoal = sumWorklogGoal(items);

  const firstDow = new Date(y, m - 1, 1).getDay();
  const lastDate = new Date(y, m, 0).getDate();
  const yearFrom = `${y}-01-01`;
  const monthFrom = `${ym}-01`;
  const monthTo = `${ym}-${String(lastDate).padStart(2, '0')}`;
  const allIds = items.map((i) => i.id);

  const cells: ({ d: number; key: string; off: boolean; written: boolean; people: number } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  let doneCount = 0;
  let missCount = 0;
  for (let d = 1; d <= lastDate; d++) {
    const key = `${ym}-${String(d).padStart(2, '0')}`;
    const dow = new Date(y, m - 1, d).getDay();
    const off = dow === 0 || dow === 6;
    const written = writtenDates.has(key);
    if (written) doneCount++;
    else if (!off) missCount++;
    const [, people] = rangeSum(entries, allIds, key, key);
    cells.push({ d, key, off, written, people });
  }

  const rows = items.map((i) => ({
    ...i,
    mSum: rangeSum(entries, [i.id], monthFrom, monthTo),
    ySum: rangeSum(entries, [i.id], yearFrom, monthTo),
  }));
  const groups = new Map<string, typeof rows>();
  rows.forEach((r) => {
    if (!groups.has(r.세부사업명)) groups.set(r.세부사업명, []);
    groups.get(r.세부사업명)!.push(r);
  });
  const totalM = rangeSum(entries, allIds, monthFrom, monthTo);
  const totalY = rangeSum(entries, allIds, yearFrom, monthTo);

  return (
    <div>
      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="business" value={business} />
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">기준월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
        <a
          href={`/print/business-worklog?business=${encodeURIComponent(business)}&from=${monthFrom}&to=${monthTo}`}
          target="_blank"
          className={`${btnSecondary} ml-auto`}
        >
          이 달 일지 인쇄 ↗
        </a>
      </form>

      <div className={card}>
        <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {DOW.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            if (!c) return <div key={`e${i}`} />;
            const tone = c.off
              ? 'border-zinc-200 bg-[#f7f5ef] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40'
              : c.written
                ? 'border-[#bfd4d7] bg-[#f4f9fa] dark:border-cyan-800 dark:bg-cyan-950/30'
                : 'border-[#e3c9c6] bg-[#fdf7f6] dark:border-red-900 dark:bg-red-950/20';
            return (
              <a
                key={c.key}
                href={`/business/daily?business=${encodeURIComponent(business)}&date=${c.key}`}
                className={`flex min-h-[70px] flex-col gap-1 rounded-md border p-2 text-left transition-shadow hover:shadow-sm ${tone}`}
              >
                <span className="font-mono text-sm font-bold">{c.d}</span>
                <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400">{c.off ? '주말' : c.written ? '작성' : '미작성'}</span>
                {c.people > 0 && <span className="mt-auto font-mono text-[11px] font-semibold text-brand">{nf(c.people)}명</span>}
              </a>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span>작성 {doneCount}일 · 미작성 {missCount}일</span>
        </div>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold">월계 집계</h3>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>세부사업</th>
                <th className={th}>중분류</th><th className={th}>소분류</th>
                <th className={th}>연간목표(명)</th>
                <th className={th}>{m}월 월계(건)</th><th className={th}>{m}월 월계(명)</th>
                <th className={th}>누계(건)</th><th className={th}>누계(명)</th>
                <th className={th}>달성율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const span = i > 0 && rows[i - 1].세부사업명 === r.세부사업명 ? 0 : rows.filter((x) => x.세부사업명 === r.세부사업명).length;
                const mspan = midSpan(rows, i);
                return (
                  <tr key={r.id}>
                    {span > 0 && <td className={`${td} font-medium`} rowSpan={span}>{r.세부사업명}</td>}
                    {mspan > 0 && <td className={`${td} text-left align-middle`} rowSpan={mspan}>{r.중분류}</td>}
                    <td className={`${td} text-left`}>{r.소분류 || '–'}</td>
                    <td className={`${td} text-zinc-400`}>{nf(r.목표명)}</td>
                    <td className={td}>{nf(r.mSum[0])}</td><td className={td}>{nf(r.mSum[1])}</td>
                    <td className={`${td} font-semibold`}>{nf(r.ySum[0])}</td><td className={`${td} font-semibold`}>{nf(r.ySum[1])}</td>
                    <td className={td}><PctBadge value={r.ySum[1] || r.ySum[0]} goal={r.목표명 || r.목표건} /></td>
                  </tr>
                );
              })}
              {[...groups.entries()].map(([name, groupRows]) => {
                const mP = groupRows.reduce((a, r) => a + r.mSum[1], 0);
                const mC = groupRows.reduce((a, r) => a + r.mSum[0], 0);
                const yP = groupRows.reduce((a, r) => a + r.ySum[1], 0);
                const yC = groupRows.reduce((a, r) => a + r.ySum[0], 0);
                const goalP = groupRows.reduce((a, r) => a + r.목표명, 0);
                return (
                  <tr key={`sub-${name}`} className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                    <td className={td} colSpan={3}>소계 · {name}</td>
                    <td className={td}>{nf(goalP)}</td>
                    <td className={td}>{nf(mC)}</td><td className={td}>{nf(mP)}</td>
                    <td className={td}>{nf(yC)}</td><td className={td}>{nf(yP)}</td>
                    <td className={td}><PctBadge value={yP} goal={goalP} /></td>
                  </tr>
                );
              })}
              <tr className="bg-brand-dark font-semibold text-white">
                <td className={`${td} !text-white`} colSpan={4}>총 계</td>
                <td className={`${td} !text-white`}>{nf(totalM[0])}</td><td className={`${td} !text-white`}>{nf(totalM[1])}</td>
                <td className={`${td} !text-white`}>{nf(totalY[0])}</td><td className={`${td} !text-white`}>{nf(totalY[1])}</td>
                <td className={`${td} !text-white`}>{fpct(pct(totalY[1], grandGoal))}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
