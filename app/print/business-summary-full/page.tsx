import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import PrintButton from '@/components/print/PrintButton';
import CopyPlanTableButton from '@/components/business/CopyPlanTableButton';
import FullReportBody from '@/components/business/full/FullReportBody';
import { getFullBoardReportData } from '@/lib/mutate/boardFullReport';
import { btnSecondary, card, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BusinessSummaryFullPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-full'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  const data = await getFullBoardReportData(ym);

  return (
    <div>
      <div className={`${card} print:hidden flex flex-wrap items-center gap-3`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <PrintButton />
        <CopyPlanTableButton targetId="full-report-body" />
        <a href={`/api/board-full-report-hwpx?ym=${ym}`} download={`이사회자료_${ym}.hwpx`} className={btnSecondary}>hwpx 다운로드</a>
      </div>

      <div className="bg-white dark:bg-zinc-900">
        <div id="full-report-body">
          <FullReportBody data={data} />
        </div>
      </div>
    </div>
  );
}
