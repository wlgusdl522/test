import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import CleanTableCopy from '@/components/business/full/CleanTableCopy';
import CopyPlanTableButton from '@/components/business/CopyPlanTableButton';
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
          인쇄 · 복사 화면 열기
        </Link>
        <CopyPlanTableButton targetId="full-report-body" className={btnSecondary} />
      </div>
      <p className="mb-3 text-xs text-zinc-400">
        각 탭에서 입력한 내용을 한 화면에 모아 보여줍니다(읽기 전용). 수정은 각 탭에서 해주세요.
        표를 한글에 붙여넣을 땐 드래그로 직접 선택하지 말고 위 &quot;원본 서식 그대로 복사&quot; 버튼을
        눌러주세요 — 표 여러 개를 가로질러 드래그하면 브라우저가 셀 경계를 놓쳐 붙여넣기가 깨질 수 있습니다.
      </p>
      <CleanTableCopy containerId="full-report-body" />
      <div className={card}>
        <div id="full-report-body">
          <FullReportBody data={data} />
        </div>
      </div>
    </>
  );
}
