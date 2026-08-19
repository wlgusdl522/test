import { hasPageAccess } from '@/lib/mutate/permissions';
import BusinessSummaryTabsClient from './BusinessSummaryTabsClient';

// 이사회자료 자체는 하위에 업무보고/사업실적/자원봉사/회계/후원 서브탭을 가지므로, 이 최상단 탭에서는
// 그 서브탭 경로들도 함께 "이사회자료"로 활성 표시되어야 한다 — match로 그 목록을 넘긴다.
const TABS = [
  {
    href: '/business-summary', label: '이사회자료', pageId: 'business-summary',
    match: [
      '/business-summary', '/business-summary/overview', '/business-summary/report', '/business-summary/headcount',
      '/business-summary/volunteers', '/business-summary/accounting', '/business-summary/donations',
      '/business-summary/admin-notes', '/business-summary/full',
    ],
  },
  { href: '/business-summary/quarterly', label: '분기실적보고', pageId: 'business-summary', match: ['/business-summary/quarterly'] },
];

// 탭마다 권한이 다를 수 있다(서브탭 각각에서 개별 체크) — 권한 없는 탭은 목록에서 숨긴다.
export default async function BusinessSummaryTabs() {
  const checks = await Promise.all(TABS.map((t) => hasPageAccess(t.pageId)));
  const visible = TABS.filter((_, i) => checks[i]).map(({ href, label, match }) => ({ href, label, match }));
  return <BusinessSummaryTabsClient tabs={visible} />;
}
