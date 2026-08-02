export type NavItem = { href: string; label: string };
// flat: 항목이 하나뿐이어도 앞으로 늘어날 계획이 없는 섹션만 펼치고 접는 토글 없이 바로 링크로 보여준다.
export type NavSection = { label: string; items: NavItem[]; flat?: boolean };

export const STANDALONE_NAV_ITEMS: NavItem[] = [
  { href: '/', label: '홈' },
  { href: '/mypage', label: '마이페이지' },
];

export const NAV_SECTIONS: NavSection[] = [
  {
    label: '인사관리',
    items: [
      { href: '/staff', label: '직원관리' },
      { href: '/staff/history', label: '계정이력' },
      { href: '/staff/directory', label: '전직원 주소록' },
    ],
  },
  {
    label: '업무관리',
    items: [
      { href: '/weekly-plan', label: '주간업무' },
    ],
  },
  {
    label: '차량관리',
    flat: true,
    items: [
      { href: '/vehicles', label: '차량관리' },
    ],
  },
  {
    label: '지출관리',
    flat: true,
    items: [
      { href: '/expenses', label: '지출관리' },
    ],
  },
  {
    label: '설정',
    items: [
      { href: '/settings/simple-lists', label: '팀 / 직급 / 결재라인' },
      { href: '/settings/business-list', label: '사업목록' },
      { href: '/settings/vehicles', label: '차량목록' },
      { href: '/settings/budget-items', label: '예산과목' },
      { href: '/settings/permissions', label: '권한설정' },
      { href: '/settings/approval-rules', label: '결재라인 전결기준' },
      { href: '/settings/system', label: '시스템 설정값' },
    ],
  },
];
