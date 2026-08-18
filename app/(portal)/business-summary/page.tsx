import { Fragment } from 'react';
import { buildWorklogItems, getWorklogBusinessNames } from '@/lib/mutate/businessPlan';
import { getDailyEntries, rangeSum } from '@/lib/mutate/worklogEntry';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import ActualHeadcountListClient from '@/components/business/ActualHeadcountListClient';
import { getHeadcountRows, getHeadcountDate } from '@/lib/mutate/boardHeadcount';
import { setHeadcountDateAction } from '@/app/(portal)/business-summary/boardHeadcountActions';
import { badgeBase, badgeTone, btnSecondary, card, h2, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');
const fpct = (v: number | null) => (v === null ? '–' : v >= 100 ? v.toFixed(0) : v.toFixed(1));
const pct = (v: number, g: number) => (g > 0 ? (v / g) * 100 : null);

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function monthEndDay(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function md(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

const numCell = `${td} text-right tabular-nums`;

function PctBadge({ value, goal }: { value: number; goal: number }) {
  const p = pct(value, goal);
  if (p === null) return <span className="text-xs text-zinc-400">–</span>;
  const tone = p >= 100 ? badgeTone.green : p >= 50 ? badgeTone.amber : badgeTone.gray;
  return <span className={`${badgeBase} ${tone}`}>{fpct(p)}%</span>;
}

// 조회월(또는 오늘 중 이른 날)까지 일일실적이 한 건도 없으면 "미입력",
// 중간까지만 입력돼 있으면 마지막 입력일을 보여준다 — 실적 0과 미입력을 구분하기 위함.
function EntryStatusBadge({ lastDate, effectiveEnd }: { lastDate: string | null; effectiveEnd: string }) {
  if (lastDate === null) {
    return <span className={`${badgeBase} ${badgeTone.red} mt-1 block w-fit`}>미입력</span>;
  }
  if (lastDate < effectiveEnd) {
    return <span className={`${badgeBase} ${badgeTone.amber} mt-1 block w-fit`}>{md(lastDate)}까지 입력</span>;
  }
  return null;
}

export default async function BusinessSummaryBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-summary'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const today = todayKst();
  const ym = ymParam || today.slice(0, 7);
  const year = ym.slice(0, 4);
  const yearStart = `${year}-01-01`;
  const monthStart = `${ym}-01`;
  const cumEnd = monthEndDay(ym);
  const effectiveEnd = cumEnd < today ? cumEnd : today;

  const businesses = await getWorklogBusinessNames();
  const perBusiness = await Promise.all(
    businesses.map(async (business) => {
      const [items, entries] = await Promise.all([buildWorklogItems(business), getDailyEntries(business)]);
      const ids = new Set(items.map((i) => i.id));
      const inRange = entries.filter((e) => ids.has(e.항목ID) && e.날짜 >= monthStart && e.날짜 <= effectiveEnd);
      const lastDate = inRange.length ? inRange.reduce((a, e) => (e.날짜 > a ? e.날짜 : a), inRange[0].날짜) : null;

      const groups = new Map<string, typeof items>();
      items.forEach((i) => {
        if (!groups.has(i.세부사업명)) groups.set(i.세부사업명, []);
        groups.get(i.세부사업명)!.push(i);
      });
      const subRows = [...groups.entries()].map(([세부사업명, groupItems]) => {
        const subIds = groupItems.map((i) => i.id);
        const [cumC, cumP] = rangeSum(entries, subIds, yearStart, cumEnd);
        const [curC, curP] = rangeSum(entries, subIds, monthStart, cumEnd);
        return {
          세부사업명,
          목표건: groupItems.reduce((a, i) => a + i.목표건, 0),
          목표명: groupItems.reduce((a, i) => a + i.목표명, 0),
          전월누계건: cumC - curC, 전월누계명: cumP - curP,
          금월실적건: curC, 금월실적명: curP,
          누계건: cumC, 누계명: cumP,
        };
      });
      return {
        business,
        subRows, lastDate,
        goalC: subRows.reduce((a, r) => a + r.목표건, 0),
        goalP: subRows.reduce((a, r) => a + r.목표명, 0),
        prevC: subRows.reduce((a, r) => a + r.전월누계건, 0),
        prevP: subRows.reduce((a, r) => a + r.전월누계명, 0),
        curC: subRows.reduce((a, r) => a + r.금월실적건, 0),
        curP: subRows.reduce((a, r) => a + r.금월실적명, 0),
        cumC: subRows.reduce((a, r) => a + r.누계건, 0),
        cumP: subRows.reduce((a, r) => a + r.누계명, 0),
      };
    })
  );

  const [headcountRows, headcountDate] = await Promise.all([getHeadcountRows(ym), getHeadcountDate(ym)]);

  const grandGoalC = perBusiness.reduce((a, b) => a + b.goalC, 0);
  const grandGoalP = perBusiness.reduce((a, b) => a + b.goalP, 0);
  const grandPrevC = perBusiness.reduce((a, b) => a + b.prevC, 0);
  const grandPrevP = perBusiness.reduce((a, b) => a + b.prevP, 0);
  const grandCurC = perBusiness.reduce((a, b) => a + b.curC, 0);
  const grandCurP = perBusiness.reduce((a, b) => a + b.curP, 0);
  const grandCumC = perBusiness.reduce((a, b) => a + b.cumC, 0);
  const grandCumP = perBusiness.reduce((a, b) => a + b.cumP, 0);

  return (
    <>
      <BoardSubTabs />
      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <div className={card}>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={`${th} whitespace-nowrap`} rowSpan={2}>사업</th>
                <th className={`${th} whitespace-nowrap`} rowSpan={2}>세부사업</th>
                <th className={`${th} text-right`} colSpan={2}>연간목표</th>
                <th className={`${th} text-right`} colSpan={2}>전월누계</th>
                <th className={`${th} text-right`} colSpan={2}>금월실적</th>
                <th className={`${th} text-right`} colSpan={2}>누계</th>
                <th className={`${th} text-center`} colSpan={2}>달성율</th>
              </tr>
              <tr>
                <th className={`${th} text-right`}>건</th><th className={`${th} text-right`}>명</th>
                <th className={`${th} text-right`}>건</th><th className={`${th} text-right`}>명</th>
                <th className={`${th} text-right`}>건</th><th className={`${th} text-right`}>명</th>
                <th className={`${th} text-right`}>건</th><th className={`${th} text-right`}>명</th>
                <th className={`${th} text-center`}>건</th><th className={`${th} text-center`}>명</th>
              </tr>
            </thead>
            <tbody>
              {perBusiness.map((b) => (
                <Fragment key={b.business}>
                  {b.subRows.length === 0 ? (
                    <tr className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                      <td className={`${td} whitespace-nowrap font-medium`}>
                        {b.business}
                        <EntryStatusBadge lastDate={b.lastDate} effectiveEnd={effectiveEnd} />
                      </td>
                      <td className={`${td} text-left text-zinc-400`} colSpan={11}>등록된 계획 없음</td>
                    </tr>
                  ) : (
                    b.subRows.map((r, i) => (
                      <tr key={r.세부사업명} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                        {i === 0 && (
                          <td className={`${td} whitespace-nowrap font-medium align-top`} rowSpan={b.subRows.length}>
                            {b.business}
                            <EntryStatusBadge lastDate={b.lastDate} effectiveEnd={effectiveEnd} />
                          </td>
                        )}
                        <td className={`${td} whitespace-nowrap`}>{r.세부사업명}</td>
                        <td className={`${numCell} text-zinc-400`}>{nf(r.목표건)}</td>
                        <td className={`${numCell} text-zinc-400`}>{nf(r.목표명)}</td>
                        <td className={`${numCell} text-zinc-400`}>{nf(r.전월누계건)}</td>
                        <td className={`${numCell} text-zinc-400`}>{nf(r.전월누계명)}</td>
                        <td className={numCell}>{nf(r.금월실적건)}</td><td className={numCell}>{nf(r.금월실적명)}</td>
                        <td className={`${numCell} font-semibold`}>{nf(r.누계건)}</td><td className={`${numCell} font-semibold`}>{nf(r.누계명)}</td>
                        <td className={`${td} text-center`}><PctBadge value={r.누계건} goal={r.목표건} /></td>
                        <td className={`${td} text-center`}><PctBadge value={r.누계명} goal={r.목표명} /></td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                    <td className={`${td} text-left whitespace-nowrap`} colSpan={2}>소계 · {b.business}</td>
                    <td className={numCell}>{nf(b.goalC)}</td><td className={numCell}>{nf(b.goalP)}</td>
                    <td className={numCell}>{nf(b.prevC)}</td><td className={numCell}>{nf(b.prevP)}</td>
                    <td className={numCell}>{nf(b.curC)}</td><td className={numCell}>{nf(b.curP)}</td>
                    <td className={numCell}>{nf(b.cumC)}</td><td className={numCell}>{nf(b.cumP)}</td>
                    <td className={`${td} text-center`}><PctBadge value={b.cumC} goal={b.goalC} /></td>
                    <td className={`${td} text-center`}><PctBadge value={b.cumP} goal={b.goalP} /></td>
                  </tr>
                </Fragment>
              ))}
              <tr className="bg-brand-dark font-semibold text-white">
                <td className={`${td} !text-white text-left whitespace-nowrap`} colSpan={2}>총 계</td>
                <td className={`${numCell} !text-white`}>{nf(grandGoalC)}</td><td className={`${numCell} !text-white`}>{nf(grandGoalP)}</td>
                <td className={`${numCell} !text-white`}>{nf(grandPrevC)}</td><td className={`${numCell} !text-white`}>{nf(grandPrevP)}</td>
                <td className={`${numCell} !text-white`}>{nf(grandCurC)}</td><td className={`${numCell} !text-white`}>{nf(grandCurP)}</td>
                <td className={`${numCell} !text-white`}>{nf(grandCumC)}</td><td className={`${numCell} !text-white`}>{nf(grandCumP)}</td>
                <td className={`${td} !text-white text-center`}>{fpct(pct(grandCumC, grandGoalC))}%</td>
                <td className={`${td} !text-white text-center`}>{fpct(pct(grandCumP, grandGoalP))}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={card}>
        <h2 className={`${h2} mb-3`}>실인원 산출내역</h2>
        <form action={setHeadcountDateAction} className="mb-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="년월" value={ym} />
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">기준일</label>
          <input type="date" name="기준일" defaultValue={headcountDate} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>기준일 저장</button>
        </form>
        <ActualHeadcountListClient ym={ym} initialRows={headcountRows} />
      </div>
    </>
  );
}
