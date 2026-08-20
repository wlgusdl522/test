import { Fragment } from 'react';
import { buildWorklogItems, getWorklogBusinessNames } from '@/lib/mutate/businessPlan';
import { getDailyEntries, rangeSum } from '@/lib/mutate/worklogEntry';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import CellRangeSelectTable from '@/components/business/CellRangeSelectTable';
import { badgeBase, badgeTone, btnSecondary, card, inputBase, table, td, th, tableWrap } from '@/lib/ui';

// 표 드래그선택(칸 단위)용 논리 컬럼 번호 — rowSpan으로 생략되는 행에서도 각 칸의 실제 의미가
// 항상 같은 숫자를 갖도록 고정해둔다(CellRangeSelectTable이 이 번호로 사각형 범위를 계산).
const COL = {
  사업: 0, 세부사업: 1,
  목표건: 2, 목표명: 3,
  전월누계건: 4, 전월누계명: 5,
  금월실적건: 6, 금월실적명: 7,
  누계건: 8, 누계명: 9,
  달성율건: 10, 달성율명: 11,
} as const;

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

  // 드래그선택용 행 번호: 사업별로 (subRows 개수 또는 최소 1) + 소계행 1개만큼 순서대로 배정
  const rowOffsets = perBusiness.reduce<number[]>((acc, b, i) => {
    const prevStart = i === 0 ? 0 : acc[i - 1];
    const prevLen = i === 0 ? 0 : Math.max(perBusiness[i - 1].subRows.length, 1) + 1;
    acc.push(prevStart + prevLen);
    return acc;
  }, []);
  const grandRow = rowOffsets.length
    ? rowOffsets[rowOffsets.length - 1] + Math.max(perBusiness[perBusiness.length - 1].subRows.length, 1) + 1
    : 0;

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
      <BoardSubTabs ym={ym} />
      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <div className={card}>
        <CellRangeSelectTable className={tableWrap}>
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
              {perBusiness.map((b, bi) => {
                const subtotalRow = rowOffsets[bi] + Math.max(b.subRows.length, 1);
                return (
                <Fragment key={b.business}>
                  {b.subRows.length === 0 ? (
                    <tr className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                      <td className={`${td} whitespace-nowrap font-medium`} data-row={rowOffsets[bi]} data-col={COL.사업}>
                        {b.business}
                        <EntryStatusBadge lastDate={b.lastDate} effectiveEnd={effectiveEnd} />
                      </td>
                      <td className={`${td} text-left text-zinc-400`} colSpan={11} data-row={rowOffsets[bi]} data-col={COL.세부사업} data-colspan={11}>등록된 계획 없음</td>
                    </tr>
                  ) : (
                    b.subRows.map((r, i) => {
                      const rowIdx = rowOffsets[bi] + i;
                      return (
                      <tr key={r.세부사업명} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                        {i === 0 && (
                          <td className={`${td} whitespace-nowrap font-medium align-top`} rowSpan={b.subRows.length} data-row={rowIdx} data-col={COL.사업} data-rowspan={b.subRows.length}>
                            {b.business}
                            <EntryStatusBadge lastDate={b.lastDate} effectiveEnd={effectiveEnd} />
                          </td>
                        )}
                        <td className={`${td} whitespace-nowrap`} data-row={rowIdx} data-col={COL.세부사업}>{r.세부사업명}</td>
                        <td className={`${numCell} text-zinc-400`} data-row={rowIdx} data-col={COL.목표건}>{nf(r.목표건)}</td>
                        <td className={`${numCell} text-zinc-400`} data-row={rowIdx} data-col={COL.목표명}>{nf(r.목표명)}</td>
                        <td className={`${numCell} text-zinc-400`} data-row={rowIdx} data-col={COL.전월누계건}>{nf(r.전월누계건)}</td>
                        <td className={`${numCell} text-zinc-400`} data-row={rowIdx} data-col={COL.전월누계명}>{nf(r.전월누계명)}</td>
                        <td className={numCell} data-row={rowIdx} data-col={COL.금월실적건}>{nf(r.금월실적건)}</td><td className={numCell} data-row={rowIdx} data-col={COL.금월실적명}>{nf(r.금월실적명)}</td>
                        <td className={`${numCell} font-semibold`} data-row={rowIdx} data-col={COL.누계건}>{nf(r.누계건)}</td><td className={`${numCell} font-semibold`} data-row={rowIdx} data-col={COL.누계명}>{nf(r.누계명)}</td>
                        <td className={`${td} text-center`} data-row={rowIdx} data-col={COL.달성율건}><PctBadge value={r.누계건} goal={r.목표건} /></td>
                        <td className={`${td} text-center`} data-row={rowIdx} data-col={COL.달성율명}><PctBadge value={r.누계명} goal={r.목표명} /></td>
                      </tr>
                      );
                    })
                  )}
                  <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                    <td className={`${td} text-left whitespace-nowrap`} colSpan={2} data-row={subtotalRow} data-col={COL.사업} data-colspan={2}>소계 · {b.business}</td>
                    <td className={numCell} data-row={subtotalRow} data-col={COL.목표건}>{nf(b.goalC)}</td><td className={numCell} data-row={subtotalRow} data-col={COL.목표명}>{nf(b.goalP)}</td>
                    <td className={numCell} data-row={subtotalRow} data-col={COL.전월누계건}>{nf(b.prevC)}</td><td className={numCell} data-row={subtotalRow} data-col={COL.전월누계명}>{nf(b.prevP)}</td>
                    <td className={numCell} data-row={subtotalRow} data-col={COL.금월실적건}>{nf(b.curC)}</td><td className={numCell} data-row={subtotalRow} data-col={COL.금월실적명}>{nf(b.curP)}</td>
                    <td className={numCell} data-row={subtotalRow} data-col={COL.누계건}>{nf(b.cumC)}</td><td className={numCell} data-row={subtotalRow} data-col={COL.누계명}>{nf(b.cumP)}</td>
                    <td className={`${td} text-center`} data-row={subtotalRow} data-col={COL.달성율건}><PctBadge value={b.cumC} goal={b.goalC} /></td>
                    <td className={`${td} text-center`} data-row={subtotalRow} data-col={COL.달성율명}><PctBadge value={b.cumP} goal={b.goalP} /></td>
                  </tr>
                </Fragment>
                );
              })}
              <tr className="bg-brand-dark font-semibold text-white">
                <td className={`${td} !text-white text-left whitespace-nowrap`} colSpan={2} data-row={grandRow} data-col={COL.사업} data-colspan={2}>총 계</td>
                <td className={`${numCell} !text-white`} data-row={grandRow} data-col={COL.목표건}>{nf(grandGoalC)}</td><td className={`${numCell} !text-white`} data-row={grandRow} data-col={COL.목표명}>{nf(grandGoalP)}</td>
                <td className={`${numCell} !text-white`} data-row={grandRow} data-col={COL.전월누계건}>{nf(grandPrevC)}</td><td className={`${numCell} !text-white`} data-row={grandRow} data-col={COL.전월누계명}>{nf(grandPrevP)}</td>
                <td className={`${numCell} !text-white`} data-row={grandRow} data-col={COL.금월실적건}>{nf(grandCurC)}</td><td className={`${numCell} !text-white`} data-row={grandRow} data-col={COL.금월실적명}>{nf(grandCurP)}</td>
                <td className={`${numCell} !text-white`} data-row={grandRow} data-col={COL.누계건}>{nf(grandCumC)}</td><td className={`${numCell} !text-white`} data-row={grandRow} data-col={COL.누계명}>{nf(grandCumP)}</td>
                <td className={`${td} !text-white text-center`} data-row={grandRow} data-col={COL.달성율건}>{fpct(pct(grandCumC, grandGoalC))}%</td>
                <td className={`${td} !text-white text-center`} data-row={grandRow} data-col={COL.달성율명}>{fpct(pct(grandCumP, grandGoalP))}%</td>
              </tr>
            </tbody>
          </table>
        </CellRangeSelectTable>
      </div>
    </>
  );
}
