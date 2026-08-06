import { getBusinessList } from '@/lib/mutate/business';
import { h1, pageFluid } from '@/lib/ui';
import BusinessTabsClient from '@/components/business/BusinessTabsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 목표설정(세부사업계획서)은 전 직원이 같이 보는 문서라 사업 목록을 거르지 않고 그대로 보여준다.
// 실적을 다루는 일계입력/월별현황/일지인쇄는 각 페이지에서 담당사업 기준으로 따로 제한한다.
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
