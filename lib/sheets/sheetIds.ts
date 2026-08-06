// Code.js와 동일한 스프레드시트 — 원본은 그대로 Google Sheets에 있고, 이 앱은 Sheets API로 직접 읽고 쓴다.
export const STAFF_SHEET_ID = '1BhyhtuWn03ZuiG5WsCqV0-pWrlEwTtckWwe-O3CQPKs'; // "1. 직원관리"
export const WEEKLY_PLAN_SHEET_ID = '1gD3c4k-VLz_9yaOYidtsZ354tms4bfKfyZCbgVQNm44'; // "2. 주간업무계획"
export const CARD_LEDGER_SHEET_ID = '1WBNt9PGWQDjwf0PtwgOOPqiJdqNdMUf1yugQenlMF-s'; // "3. 카드사용대장"
export const VEHICLE_SHEET_ID = '1JtRFxBzH1Xh7chmyMlqlAv__qYC4INR3y7FMIWGKwpQ'; // "4. 차량관리"

export const GENERAL_WORK_LOG_SHEET_ID = '1iMzG0lBTnjUdnYdGqXzo85PQ4szIfHtyHJxr14VGHnE'; // "5. 총괄업무일지"

export const TEAM_LIST_SHEET_NAME = '팀목록';
export const POSITION_LIST_SHEET_NAME = '직급목록';
export const APPROVAL_LINE_SHEET_NAME = '결재라인';

// Drive 업로드 폴더 (업무포털 공유 드라이브 폴더 안에 위치, Code.js와 동일한 폴더 재사용)
export const ITEM_CHECK_PHOTO_FOLDER_ID = '1p3VMhrkWf0vadUeOqgf1eARyG4itcH3n';
export const STAFF_STAMP_FOLDER_ID = '1amadx4xhlIISS4Yxn6wO0ebEd9p7EmWa';
export const DUTY_SIGNATURE_FOLDER_ID = '1qThex3gbk7I-2Y5xDUC-IK58EHDOqzTI'; // "당직싸인이미지업로드" (공유 드라이브 — files.create에 supportsAllDrives 필요)
