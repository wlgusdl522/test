import { hasPageAccess } from '@/lib/mutate/permissions';
import BoardSubTabsClient from './BoardSubTabsClient';

const SUB_TABS = [
  { href: '/business-summary/overview', label: '요약보고', pageId: 'business-overview' },
  { href: '/business-summary/report', label: '업무보고', pageId: 'business-board-plan' },
  { href: '/business-summary', label: '사업실적', pageId: 'business-summary' },
  { href: '/business-summary/headcount', label: '실인원', pageId: 'business-headcount' },
  { href: '/business-summary/volunteers', label: '자원봉사', pageId: 'business-volunteers' },
  { href: '/business-summary/accounting', label: '회계', pageId: 'business-accounting' },
  { href: '/business-summary/donations', label: '후원', pageId: 'business-donations' },
  { href: '/business-summary/admin-notes', label: '행정사항', pageId: 'business-admin-notes' },
  { href: '/business-summary/full', label: '전체보기', pageId: 'business-full' },
];

// "이사회자료" 최상단 탭 안에서만 쓰는 하위 탭 — 분기실적보고는 이 탭바에 속하지 않는다.
// ym을 넘기면 탭 링크마다 그대로 붙여서, 한 탭에서 고른 조회월이 다른 탭으로 넘어가도 유지된다
// (안 넘기면 각 페이지가 기본값인 이번 달로 새로 시작).
export default async function BoardSubTabs({ ym }: { ym?: string } = {}) {
  const checks = await Promise.all(SUB_TABS.map((t) => hasPageAccess(t.pageId)));
  const visible = SUB_TABS.filter((_, i) => checks[i]).map(({ href, label }) => ({ href, label }));
  return <BoardSubTabsClient tabs={visible} ym={ym} />;
}
