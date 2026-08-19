import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import BoardStatModuleView from '@/components/business/BoardStatModuleView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BusinessSummaryVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-volunteers'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  return (
    <>
      <BoardSubTabs ym={ym} />
      <BoardStatModuleView 모듈="자원봉사자" basePath="/business-summary/volunteers" ymParam={ym} />
    </>
  );
}
