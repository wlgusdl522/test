import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import BoardStatModuleView from '@/components/business/BoardStatModuleView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessSummaryDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-donations'))) return <PageAccessDenied />;

  const { ym } = await searchParams;
  return (
    <>
      <BoardSubTabs />
      <BoardStatModuleView 모듈="후원" basePath="/business-summary/donations" ymParam={ym} />
    </>
  );
}
