import BusinessSummaryTabs from '@/components/business/BusinessSummaryTabs';
import { pageFluid, h1 } from '@/lib/ui';

// 탭마다 권한이 다를 수 있어(회계/자원봉사자/후원은 각 담당자만) 여기서는 공통 접근차단을
// 하지 않고, 각 탭의 page.tsx가 자기 pageId로 개별 체크한다.
export default async function BusinessSummaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>사업관리 &gt; 전체사업 실적집계</h1>
      <BusinessSummaryTabs />
      {children}
    </main>
  );
}
