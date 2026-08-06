export type NavItem = { href: string; label: string; description?: string };
// flat: 항목이 하나뿐이어도 앞으로 늘어날 계획이 없는 섹션만 펼치고 접는 토글 없이 바로 링크로 보여준다.
export type NavSection = { label: string; items: NavItem[]; flat?: boolean };

export const NAV_SECTION_ICON_PATH: Record<string, string> = {
  인사관리: 'M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-3.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4',
  업무관리: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  차량관리: 'M8 17h8m-8 0a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0 2 2 0 00-4 0zm-9-6h10l2 6H5l2-6zm0 0l1-4h8l1 4',
  지출관리: 'M3 10h18M7 15h1m4 0h1M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
  사업관리: 'M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 13h20',
  설정: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

export const STANDALONE_NAV_ITEMS: NavItem[] = [
  { href: '/', label: '홈', description: '포털 홈으로 이동' },
  { href: '/mypage', label: '마이페이지', description: '내 정보·설정 관리' },
];

export const NAV_SECTIONS: NavSection[] = [
  {
    label: '인사관리',
    items: [
      { href: '/staff', label: '직원관리', description: '직원 정보 등록·수정·조회' },
      { href: '/staff/history', label: '계정이력', description: '계정 신규/인계 처리 이력' },
      { href: '/staff/directory', label: '전직원 주소록', description: '팀·직급별 연락처 확인' },
    ],
  },
  {
    label: '업무관리',
    items: [
      { href: '/weekly-plan', label: '주간업무', description: '업무 입력·회의록·부서장 확인' },
    ],
  },
  {
    label: '차량관리',
    flat: true,
    items: [
      { href: '/vehicles', label: '차량관리', description: '예약·운행일지·정비 이력' },
    ],
  },
  {
    label: '지출관리',
    items: [
      { href: '/expenses', label: '카드사용대장', description: '지출 등록·검수·결재' },
      { href: '/transit-card', label: '교통카드사용대장', description: '교통카드 사용 등록·조회' },
    ],
  },
  {
    label: '사업관리',
    items: [
      { href: '/business', label: '총괄업무일지', description: '세부사업계획서 · 일계입력 · 월별현황' },
    ],
  },
  {
    label: '설정',
    items: [
      { href: '/settings/simple-lists', label: '팀 / 직급 / 결재라인', description: '팀·직급·결재라인 목록 관리' },
      { href: '/settings/business-list', label: '사업목록', description: '사업명·소관팀 목록 관리' },
      { href: '/settings/vehicles', label: '차량목록', description: '보유 차량 목록 관리' },
      { href: '/settings/budget-items', label: '예산과목', description: '지출 예산 과목 관리' },
      { href: '/settings/transit-cards', label: '교통카드목록', description: '교통카드 등록·초기잔액 관리' },
      { href: '/settings/permissions', label: '권한설정', description: '직원별 권한 설정' },
      { href: '/settings/approval-rules', label: '결재라인 전결기준', description: '전결 기준 설정' },
      { href: '/settings/system', label: '시스템 설정값', description: '시스템 공통 설정값 관리' },
    ],
  },
];
