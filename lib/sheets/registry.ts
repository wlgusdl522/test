import type { KeyedTableConfig } from './keyedTable';
import { CARD_LEDGER_SHEET_ID, STAFF_SHEET_ID, VEHICLE_SHEET_ID, WEEKLY_PLAN_SHEET_ID, WORKLOG_SHEET_ID } from './sheetIds';

export const VEHICLE_REQUEST_HEADERS = [
  'id', '차량번호', '신청자이메일', '신청자명', '소속팀',
  '사용일자', '출발시간', '복귀시간', '목적', '목적지', '동승자', '비고', '등록일시',
  '반복그룹ID',
];

export const VEHICLE_MAINTENANCE_HEADERS = [
  'id', '차량번호', '정비일자', '정비내용', '주행거리', '지출액',
  '등록자이메일', '등록자명', '비고', '등록일시',
];

export const CARD_LEDGER_HEADERS = [
  'id', '구분', '사용일자', '담당자이메일', '담당자명', '사용금액', '예산과목', '사용내역', '카드번호', '등록일시',
  '검수불요여부', '검수불요사유', '상태', '반려사유',
];

export const WEEKLY_TASK_HEADERS = [
  'id', '이메일(아이디)', '성명', '소속팀', '날짜', '업무내용', '회의록후보', '부서장반영', '등록일시',
];

export const MEETING_HEADERS = [
  'id', '회의일자', '회의시간', '회의장소', '소속팀', '작성자이메일', '작성자명', '공지사항', '휴가및일정', '슈퍼비전',
];

export const REVIEW_STATUS_HEADERS = ['id', '소속팀', '주시작일', '완료여부', '확인자이메일', '확인자명', '확인일시'];

// 실제 시트엔 '도장'/'잔디웹훅' 컬럼이 물리적으로 존재하지 않아(값을 채운 사람이 아직 없어 헤더 자체가
// 비어 있었음) 정렬을 맞추려고 새로 추가한 '토요당직제외여부'를 그 앞(P열)에 끼워 넣었다.
export const STAFF_HEADERS = [
  '이메일(아이디)', '성명', '소속팀', '담당사업', '직급/직책',
  '당직대상여부', '내선번호', '휴대폰번호', '입사일', '퇴사일', '재직상태',
  '휴직시작일', '휴직종료일(예정)', '휴직사유', '비고', '토요당직제외여부', '도장', '잔디웹훅',
];

export const ACCOUNT_HISTORY_HEADERS = [
  '처리일자', '처리구분', '이전 이메일(계정)', '이전 담당자(성명)',
  '신규 이메일(계정)', '신규 담당자(성명)', '인계 사유/담당사업',
  '인계 범위(비고)', '처리자(총무)', '비고', 'id',
];

export const BUDGET_ITEM_TABLE: KeyedTableConfig = {
  spreadsheetId: CARD_LEDGER_SHEET_ID,
  sheetName: '예산과목',
  headers: ['예산과목명', '구분', '연계사업명', '소관팀', '비고'],
  primaryKey: '예산과목명',
};

export const VEHICLE_LIST_TABLE: KeyedTableConfig = {
  spreadsheetId: VEHICLE_SHEET_ID,
  sheetName: '차량목록',
  headers: ['차량번호', '차종'],
  primaryKey: '차량번호',
};

export const PAGE_ACCESS_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_SHEET_ID,
  sheetName: '권한설정',
  headers: ['페이지ID', '페이지명', '권한등급'],
  primaryKey: '페이지ID',
};

// 관리자(모든 권한설정을 무시하고 항상 전체 허용) 지정을 코드가 아니라 설정 화면에서 관리한다.
export const ADMIN_LIST_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_SHEET_ID,
  sheetName: '관리자목록',
  headers: ['이메일', '성명'],
  primaryKey: '이메일',
};

export const APPROVAL_JEONGYEOL_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_SHEET_ID,
  sheetName: '결재전결설정',
  headers: ['페이지ID', '페이지명', '전결기준', '담당표시', '결재라인여부'],
  primaryKey: '페이지ID',
};

export const PAGE_ACCESS_EXCEPTION_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_SHEET_ID,
  sheetName: '권한예외',
  headers: ['페이지ID', '이메일', '성명', '비고'],
  primaryKey: ['페이지ID', '이메일'],
};

export const STAFF_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_SHEET_ID,
  sheetName: '직원관리',
  headers: STAFF_HEADERS,
  primaryKey: '이메일(아이디)',
};

export const ACCOUNT_HISTORY_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_SHEET_ID,
  sheetName: '계정이력',
  headers: ACCOUNT_HISTORY_HEADERS,
  primaryKey: 'id',
};

export const VEHICLE_REQUEST_TABLE: KeyedTableConfig = {
  spreadsheetId: VEHICLE_SHEET_ID,
  sheetName: '차량사용신청',
  headers: VEHICLE_REQUEST_HEADERS,
  primaryKey: 'id',
};

export const VEHICLE_MAINTENANCE_TABLE: KeyedTableConfig = {
  spreadsheetId: VEHICLE_SHEET_ID,
  sheetName: '차량정비대장',
  headers: VEHICLE_MAINTENANCE_HEADERS,
  primaryKey: 'id',
};

export const CARD_LEDGER_TABLE: KeyedTableConfig = {
  spreadsheetId: CARD_LEDGER_SHEET_ID,
  sheetName: '카드사용대장',
  headers: CARD_LEDGER_HEADERS,
  primaryKey: 'id',
};

export const WEEKLY_TASK_TABLE: KeyedTableConfig = {
  spreadsheetId: WEEKLY_PLAN_SHEET_ID,
  sheetName: '주간업무',
  headers: WEEKLY_TASK_HEADERS,
  primaryKey: 'id',
};

export const MEETING_TABLE: KeyedTableConfig = {
  spreadsheetId: WEEKLY_PLAN_SHEET_ID,
  sheetName: '회의록정리',
  headers: MEETING_HEADERS,
  primaryKey: 'id',
};

export const REVIEW_STATUS_TABLE: KeyedTableConfig = {
  spreadsheetId: WEEKLY_PLAN_SHEET_ID,
  sheetName: '부서장확인상태',
  headers: REVIEW_STATUS_HEADERS,
  primaryKey: 'id',
};

export const ITEM_CHECK_PHOTO_SLOTS = ['개봉전사진1', '개봉전사진2', '개봉후사진1', '개봉후사진2'];

export const ITEM_CHECK_PHOTO_HEADERS = [
  'id', '카드사용대장ID', '사업명', '프로그램명', '지출일자', '품명', '금액',
  '개봉전사진1', '개봉전사진2', '개봉후사진1', '개봉후사진2',
  '등록자이메일', '등록자명', '등록일시', '인쇄일시',
];

export const ITEM_CHECK_PHOTO_TABLE: KeyedTableConfig = {
  spreadsheetId: CARD_LEDGER_SHEET_ID,
  sheetName: '물품검수사진',
  headers: ITEM_CHECK_PHOTO_HEADERS,
  primaryKey: 'id',
};

export const ITEM_CHECK_REPORT_HEADERS = [
  'id', '카드사용대장ID', '품명', '납품처상호', '납품처대표자', '계약금액',
  '계약체결년월일', '납품기한', '납품완료일자', '검수년월일', '검수장소',
  '등록구분', '비품등록번호', '규격', '단위', '수량', '단가', '금액', '비고',
  '검수자이메일', '검수자명', '소속부서', '등록일시', '품목명',
  '결재상태', '결재이력JSON', '인쇄일시',
];

export const ITEM_CHECK_REPORT_TABLE: KeyedTableConfig = {
  spreadsheetId: CARD_LEDGER_SHEET_ID,
  sheetName: '물품검수조서',
  headers: ITEM_CHECK_REPORT_HEADERS,
  primaryKey: 'id',
};

export const VEHICLE_LOG_HEADERS = [
  'id', '신청ID', '차량번호', '운전자이메일', '운전자명', '소속팀',
  '운행일자', '출발시간', '도착시간', '목적', '목적지',
  '출발계기판', '도착계기판', '주행거리', '비고',
  '등록일시', '결재상태', '결재이력JSON', '주유필요',
  '주유금액', '주유단가', '주유량',
];

export const VEHICLE_LOG_TABLE: KeyedTableConfig = {
  spreadsheetId: VEHICLE_SHEET_ID,
  sheetName: '차량운행일지',
  headers: VEHICLE_LOG_HEADERS,
  primaryKey: 'id',
};

// ── 사업관리(총괄업무일지) ──────────────────────────────────────────
// 사업설정/세부사업/계획항목/산출근거 4단계로 세부사업계획서를 그대로 입력받고,
// 산출근거 한 줄(직접입력 또는 인원×횟수)이 곧 업무일지의 목표 항목 하나가 된다.
// 항목ID는 별도 테이블 없이 파생 규칙으로만 존재: merge 모드면 계획항목ID, 아니면
// `계획항목ID-산출근거ID` — lib/mutate/businessPlan.ts의 buildWorklogItems가 계산한다.

export const BUSINESS_SETTINGS_HEADERS = ['id', '사업명', '결재라인JSON', '정렬순서'];

export const BUSINESS_SETTINGS_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '사업설정',
  headers: BUSINESS_SETTINGS_HEADERS,
  primaryKey: '사업명',
};

export const BUSINESS_SUB_HEADERS = ['id', '사업명', '세부사업명', '기대효과', '정렬순서'];

export const BUSINESS_SUB_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '세부사업',
  headers: BUSINESS_SUB_HEADERS,
  primaryKey: 'id',
};

export const BUSINESS_PLAN_ITEM_HEADERS = ['id', '세부사업ID', '제목', '표기방식', '예산', '사업내용', '정렬순서'];

export const BUSINESS_PLAN_ITEM_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '계획항목',
  headers: BUSINESS_PLAN_ITEM_HEADERS,
  primaryKey: 'id',
};

export const BUSINESS_PLAN_BASIS_HEADERS = [
  'id', '계획항목ID', '라벨', '직접입력여부', '인원', '횟수', '단위', '직접건', '직접명', '정렬순서',
];

export const BUSINESS_PLAN_BASIS_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '산출근거',
  headers: BUSINESS_PLAN_BASIS_HEADERS,
  primaryKey: 'id',
};

export const WORKLOG_DAILY_HEADERS = ['id', '사업명', '항목ID', '날짜', '건', '명', '작성자이메일', '작성자명', '등록일시'];

export const WORKLOG_DAILY_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '일일실적',
  headers: WORKLOG_DAILY_HEADERS,
  primaryKey: ['항목ID', '날짜'],
};

export const WORKLOG_MEMO_HEADERS = ['id', '사업명', '날짜', '활동내용', '특이사항', '작성자이메일', '작성자명', '등록일시'];

export const WORKLOG_MEMO_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '일일메모',
  headers: WORKLOG_MEMO_HEADERS,
  primaryKey: ['사업명', '날짜'],
};

// 직원관리의 "담당사업"에 없어도, 총괄업무일지를 같이 보고 써야 하는 직원을 사업별로 추가 공유한다.
export const BUSINESS_SHARE_HEADERS = ['id', '사업명', '이메일', '성명'];

export const BUSINESS_SHARE_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '사업공유',
  headers: BUSINESS_SHARE_HEADERS,
  primaryKey: ['사업명', '이메일'],
};

// 이사회자료 중 사업량 외 항목(회계/자원봉사자/후원) — 모듈별로 항목(틀)만 먼저 두고
// 담당자가 월별 값을 직접 입력하게 한다. 전월누계/누계는 저장된 월별 값에서 매번 계산한다.
export const BOARD_STAT_ITEM_HEADERS = ['id', '모듈', '항목명', '정렬순서'];

export const BOARD_STAT_ITEM_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회항목',
  headers: BOARD_STAT_ITEM_HEADERS,
  primaryKey: 'id',
};

// 시설: 회계는 복지관/요양센터/데이케어센터가 서로 다른 값을 가지므로 항목ID+년월에 더해
// 시설까지 키로 잡는다. 자원봉사자/후원처럼 시설 구분이 없는 모듈은 '전체' 고정값을 쓴다.
export const BOARD_STAT_VALUE_HEADERS = ['id', '항목ID', '시설', '년월', '값', '작성자이메일', '작성자명', '등록일시'];

export const BOARD_STAT_VALUE_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회월별값',
  headers: BOARD_STAT_VALUE_HEADERS,
  primaryKey: ['항목ID', '시설', '년월'],
};

// 이사회자료 "업무보고" 서술형 표(사업보고/사업계획 구분) — 사업량 표와 별개로,
// 지난 기간의 사업보고와 다음 기간의 사업계획을 직접 작성해 넣는 목록. 구분 컬럼을 맨 뒤에
// 추가한 이유: 기존에 이미 쌓여있던 데이터(전부 사업계획이던 시절)의 앞쪽 컬럼 위치가
// 그대로 유지되어야 해서다 — 중간에 끼워 넣으면 기존 행의 값이 한 칸씩 밀려 읽힌다.
// 년월도 구분과 같은 이유로 맨 뒤에 추가 — 월조회가 생기기 전 데이터는 조회 시점의 월로 간주한다.
export const BOARD_PLAN_HEADERS = ['id', '사업명', '실시월일', '내용', '기대효과', '정렬순서', '구분', '년월'];

export const BOARD_PLAN_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회사업계획',
  headers: BOARD_PLAN_HEADERS,
  primaryKey: 'id',
};

// 업무보고 표 위에 표시하는 기간 문구(예: "2026. 6. 4. ~ 2026. 8. 5.") — 조회월별로 관리자가 직접 입력.
export const BOARD_REPORT_PERIOD_HEADERS = ['구분', '년월', '기간텍스트'];

export const BOARD_REPORT_PERIOD_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회기간설정',
  headers: BOARD_REPORT_PERIOD_HEADERS,
  primaryKey: ['구분', '년월'],
};
