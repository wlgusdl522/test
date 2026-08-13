import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import BoardStatModuleView from '@/components/business/BoardStatModuleView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessSummaryAccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; facility?: string }>;
}) {
  if (!(await hasPageAccess('business-accounting'))) return <PageAccessDenied />;

  const { ym, facility } = await searchParams;
  return (
    <>
      <BoardSubTabs />
      <BoardStatModuleView 모듈="회계" basePath="/business-summary/accounting" ymParam={ym} facilityParam={facility} />
    </>
  );
}
