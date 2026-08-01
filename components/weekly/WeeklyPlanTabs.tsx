import { hasPageAccess } from '@/lib/mutate/permissions';
import WeeklyPlanTabsClient from './WeeklyPlanTabsClient';

const TABS = [
  { href: '/weekly-plan', label: '작성', pageId: 'weekly-plan-write' },
  { href: '/weekly-plan/team', label: '전체보기', pageId: 'weekly-plan-team-view' },
  { href: '/weekly-plan/review', label: '부서장확인', pageId: 'weekly-plan-review' },
  { href: '/weekly-plan/meeting', label: '회의록작성', pageId: 'weekly-plan-meeting' },
];

// 권한설정에서 막힌 탭은 목록에 아예 안 보이게 — 눌러야만 "권한 없음"을 확인하는 대신
// 애초에 볼 수 없는 탭은 노출하지 않는다.
export default async function WeeklyPlanTabs() {
  const checks = await Promise.all(TABS.map((t) => hasPageAccess(t.pageId)));
  const visible = TABS.filter((_, i) => checks[i]).map(({ href, label }) => ({ href, label }));
  return <WeeklyPlanTabsClient tabs={visible} />;
}
