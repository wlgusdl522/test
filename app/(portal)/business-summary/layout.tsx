import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BusinessSummaryTabsClient from '@/components/business/BusinessSummaryTabsClient';
import { pageFluid, h1 } from '@/lib/ui';

export default async function BusinessSummaryLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasPageAccess('business-summary'))) return <PageAccessDenied />;

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>사업관리 &gt; 전체사업 실적집계</h1>
      <BusinessSummaryTabsClient />
      {children}
    </main>
  );
}
