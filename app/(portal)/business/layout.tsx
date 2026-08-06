import { getBusinessList } from '@/lib/mutate/business';
import { h1, pageFluid } from '@/lib/ui';
import BusinessTabsClient from '@/components/business/BusinessTabsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const businesses = await getBusinessList();
  return (
    <main className={pageFluid}>
      <h1 className={h1}>총괄업무일지</h1>
      <BusinessTabsClient businesses={businesses} />
      {children}
    </main>
  );
}
