import type { KeyedTableConfig } from './keyedTable';
import { CARD_LEDGER_SHEET_ID, STAFF_SHEET_ID, VEHICLE_SHEET_ID } from './sheetIds';

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
