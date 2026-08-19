import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import BoardReportSection from '@/components/business/BoardReportSection';
import { getBoardPlanEntries } from '@/lib/mutate/boardPlan';
import { btnOutline, btnSecondary, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BusinessSummaryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-board-plan'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);

  const [사업보고, 사업계획] = await Promise.all([
    getBoardPlanEntries('사업보고', ym),
    getBoardPlanEntries('사업계획', ym),
  ]);

  return (
    <>
      <BoardSubTabs ym={ym} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/report/view?ym=${ym}`} className={btnOutline}>보기 전용 화면</Link>
      </div>
      <BoardReportSection index={1} 구분="사업보고" ym={ym} entries={사업보고} />
      <BoardReportSection index={2} 구분="사업계획" ym={ym} entries={사업계획} />
    </>
  );
}
