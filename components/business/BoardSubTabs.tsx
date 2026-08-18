import { hasPageAccess } from '@/lib/mutate/permissions';
import BoardSubTabsClient from './BoardSubTabsClient';

const SUB_TABS = [
  { href: '/business-summary/overview', label: '요약보고', pageId: 'business-overview' },
  { href: '/business-summary/report', label: '업무보고', pageId: 'business-board-plan' },
  { href: '/business-summary', label: '사업실적', pageId: 'business-summary' },
  { href: '/business-summary/volunteers', label: '자원봉사', pageId: 'business-volunteers' },
  { href: '/business-summary/accounting', label: '회계', pageId: 'business-accounting' },
  { href: '/business-summary/donations', label: '후원', pageId: 'business-donations' },
  { href: '/business-summary/admin-notes', label: '행정사항', pageId: 'business-admin-notes' },
];

// "이사회자료" 최상단 탭 안에서만 쓰는 하위 탭 — 분기실적보고는 이 탭바에 속하지 않는다.
export default async function BoardSubTabs() {
  const checks = await Promise.all(SUB_TABS.map((t) => hasPageAccess(t.pageId)));
  const visible = SUB_TABS.filter((_, i) => checks[i]).map(({ href, label }) => ({ href, label }));
  return <BoardSubTabsClient tabs={visible} />;
}
