import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import FullReportBody from '@/components/business/full/FullReportBody';
import { getFullBoardReportData } from '@/lib/mutate/boardFullReport';
import { btnOutline, btnSecondary, card, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BusinessSummaryFullPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-full'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  const data = await getFullBoardReportData(ym);

  return (
    <>
      <BoardSubTabs ym={ym} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/print/business-summary-full?ym=${ym}`} target="_blank" className={btnOutline}>
          인쇄 · hwpx 다운로드 화면 열기
        </Link>
      </div>
      <p className="mb-3 text-xs text-zinc-400">
        각 탭에서 입력한 내용을 한 화면에 모아 보여줍니다(읽기 전용). 수정은 각 탭에서 해주세요.
      </p>
      <div className={card}>
        <FullReportBody data={data} />
      </div>
    </>
  );
}
