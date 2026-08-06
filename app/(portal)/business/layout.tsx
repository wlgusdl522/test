import { getViewerBusinessList } from '@/lib/mutate/business';
import { h1, pageFluid } from '@/lib/ui';
import BusinessTabsClient from '@/components/business/BusinessTabsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const businesses = await getViewerBusinessList();
  return (
    <main className={pageFluid}>
      <h1 className={h1}>총괄업무일지</h1>
      {businesses.length === 0 ? (
        <p className="text-sm text-zinc-500">담당하시는 사업이 없습니다. 설정 &gt; 직원관리에서 담당사업을 등록해주세요.</p>
      ) : (
        <>
          <BusinessTabsClient businesses={businesses} />
          {children}
        </>
      )}
    </main>
  );
}
