import { hasPageAccess } from '@/lib/mutate/permissions';
import BusinessSummaryTabsClient from './BusinessSummaryTabsClient';

const TABS = [
  { href: '/business-summary', label: '이사회자료', pageId: 'business-summary' },
  { href: '/business-summary/quarterly', label: '분기실적보고', pageId: 'business-summary' },
  { href: '/business-summary/accounting', label: '회계', pageId: 'business-accounting' },
  { href: '/business-summary/volunteers', label: '자원봉사자', pageId: 'business-volunteers' },
  { href: '/business-summary/donations', label: '후원', pageId: 'business-donations' },
];

// 탭마다 권한이 다를 수 있다(회계/자원봉사자/후원은 각 담당자만) — 권한 없는 탭은 목록에서 숨긴다.
export default async function BusinessSummaryTabs() {
  const checks = await Promise.all(TABS.map((t) => hasPageAccess(t.pageId)));
  const visible = TABS.filter((_, i) => checks[i]).map(({ href, label }) => ({ href, label }));
  return <BusinessSummaryTabsClient tabs={visible} />;
}
