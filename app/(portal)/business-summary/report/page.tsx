import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import BoardReportSection from '@/components/business/BoardReportSection';
import { getBoardPlanEntries } from '@/lib/mutate/boardPlan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessSummaryReportPage() {
  if (!(await hasPageAccess('business-board-plan'))) return <PageAccessDenied />;

  const [사업보고, 사업계획] = await Promise.all([
    getBoardPlanEntries('사업보고'),
    getBoardPlanEntries('사업계획'),
  ]);

  return (
    <>
      <BoardSubTabs />
      <BoardReportSection index={1} 구분="사업보고" entries={사업보고} />
      <BoardReportSection index={2} 구분="사업계획" entries={사업계획} />
    </>
  );
}
