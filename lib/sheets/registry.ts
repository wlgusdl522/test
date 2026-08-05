import type { KeyedTableConfig } from './keyedTable';
import { CARD_LEDGER_SHEET_ID, GENERAL_WORK_LOG_SHEET_ID, STAFF_SHEET_ID, VEHICLE_SHEET_ID, WEEKLY_PLAN_SHEET_ID } from './sheetIds';

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

export const STAFF_HEADERS = [
  '이메일(아이디)', '성명', '소속팀', '담당사업', '직급/직책',
  '당직대상여부', '내선번호', '휴대폰번호', '입사일', '퇴사일', '재직상태',
  '휴직시작일', '휴직종료일(예정)', '휴직사유', '비고', '도장', '잔디웹훅',
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

// 총괄업무일지: 사업(프로그램)마다 구분항목 트리와 목표(건/명)가 다르므로 항목 자체를 화면에서 직접
// 추가·수정하고(GENERAL_LOG_ITEM_TABLE), 날짜별 실적은 항목ID를 참조하는 별도 테이블에 쌓는다.
// 기존 "2. 주간업무계획" 파일 대신 총괄업무일지 전용 스프레드시트(GENERAL_WORK_LOG_SHEET_ID)를 쓴다.
export const GENERAL_LOG_ITEM_HEADERS = [
  'id', '사업명', '대분류', '중분류', '세부항목', '정렬순서', '목표건', '목표명',
];

export const GENERAL_LOG_ITEM_TABLE: KeyedTableConfig = {
  spreadsheetId: GENERAL_WORK_LOG_SHEET_ID,
  sheetName: '총괄업무일지_항목',
  headers: GENERAL_LOG_ITEM_HEADERS,
  primaryKey: 'id',
};

export const GENERAL_LOG_DAILY_HEADERS = [
  '사업명', '날짜', '항목ID', '건', '명', '작성자이메일', '작성자명', '등록일시',
];

export const GENERAL_LOG_DAILY_TABLE: KeyedTableConfig = {
  spreadsheetId: GENERAL_WORK_LOG_SHEET_ID,
  sheetName: '총괄업무일지_일계',
  headers: GENERAL_LOG_DAILY_HEADERS,
  primaryKey: ['사업명', '날짜', '항목ID'],
};

// 업무내용 행과 특이사항을 한 탭에 같이 담는다 — 특이사항은 하루에 한 줄뿐이라 별도 탭을 두기보다
// 구분 컬럼('업무' | '특이사항')으로만 나눈다.
export const GENERAL_LOG_CONTENT_HEADERS = [
  'id', '사업명', '날짜', '구분', '내용', '실적', '비고', '작성자이메일', '작성자명', '등록일시',
];

export const GENERAL_LOG_CONTENT_TABLE: KeyedTableConfig = {
  spreadsheetId: GENERAL_WORK_LOG_SHEET_ID,
  sheetName: '총괄업무일지_내용',
  headers: GENERAL_LOG_CONTENT_HEADERS,
  primaryKey: 'id',
};
