import type { KeyedTableConfig } from './keyedTable';
import { CARD_LEDGER_SHEET_ID, STAFF_SHEET_ID, VEHICLE_SHEET_ID } from './sheetIds';

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
