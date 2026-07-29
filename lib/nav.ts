export type NavItem = { href: string; label: string };
export type NavSection = { label: string; items: NavItem[] };

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
      { href: '/weekly-plan/meeting', label: '회의록 정리' },
      { href: '/weekly-plan/review', label: '부서장 확인' },
    ],
  },
  {
    label: '차량관리',
    items: [
      { href: '/vehicles/requests', label: '차량사용신청' },
      { href: '/vehicles/maintenance', label: '차량정비대장' },
      { href: '/settings/vehicles', label: '차량목록' },
    ],
  },
  {
    label: '지출관리',
    items: [
      { href: '/expenses', label: '카드사용대장' },
      { href: '/expenses/photos', label: '물품검수사진' },
      { href: '/settings/budget-items', label: '예산과목' },
    ],
  },
  {
    label: '설정',
    items: [
      { href: '/settings/simple-lists', label: '팀 / 직급 / 결재라인' },
      { href: '/settings/business-list', label: '사업목록' },
      { href: '/settings/permissions', label: '권한설정' },
      { href: '/settings/approval-rules', label: '결재라인 전결기준' },
      { href: '/settings/system', label: '시스템 설정값' },
    ],
  },
];
