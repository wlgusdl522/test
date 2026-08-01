// 새 게시판(페이지)이 생기면 여기 한 줄만 등록해두면, 실제 권한 등급/전결기준은
// 설정 화면에서 코드 재배포 없이 바꿀 수 있다 (Index.html의 CONFIGURABLE_PAGES/PRINTABLE_PAGES와 동일).

export const CONFIGURABLE_PAGES = [
  { id: 'staff-admin', label: '직원관리' },
  { id: 'weekly-plan-write', label: '주간업무 - 작성' },
  { id: 'weekly-plan-review', label: '주간업무 - 부서장확인' },
  { id: 'weekly-plan-meeting', label: '주간업무 - 회의록작성' },
];

export const PRINTABLE_PAGES = [
  { id: 'card-ledger', label: '카드사용대장' },
  { id: 'weekly-plan-team', label: '주간업무계획 (팀별)' },
  { id: 'weekly-plan-rollup', label: '주간업무계획 (부서별 취합)' },
  { id: 'vehicle-maintenance', label: '차량정비대장' },
  { id: 'vehicle-log-monthly', label: '차량운행일지 (월별대장출력)' },
];

export const PAGE_ACCESS_TIERS = [
  { value: '전체', label: '전체 직원' },
  { value: '팀장이상', label: '팀장 이상 (관장/부장/과장/팀장)' },
  { value: '관장부장만', label: '관장/부장만' },
];

export const DAMDANG_DISPLAY_MODES = ['자동', '표시', '숨김'];
export const APPROVAL_LINE_USAGE_MODES = ['사용', '미사용'];
