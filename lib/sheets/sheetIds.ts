// Code.js와 동일한 스프레드시트 — 원본은 그대로 Google Sheets에 있고, 이 앱은 Sheets API로 직접 읽고 쓴다.
export const STAFF_SHEET_ID = '1BhyhtuWn03ZuiG5WsCqV0-pWrlEwTtckWwe-O3CQPKs'; // "1. 직원관리"
export const WEEKLY_PLAN_SHEET_ID = '1gD3c4k-VLz_9yaOYidtsZ354tms4bfKfyZCbgVQNm44'; // "2. 주간업무계획"
export const CARD_LEDGER_SHEET_ID = '1WBNt9PGWQDjwf0PtwgOOPqiJdqNdMUf1yugQenlMF-s'; // "3. 카드사용대장"
export const VEHICLE_SHEET_ID = '1JtRFxBzH1Xh7chmyMlqlAv__qYC4INR3y7FMIWGKwpQ'; // "4. 차량관리"
export const WORKLOG_SHEET_ID = '1iMzG0lBTnjUdnYdGqXzo85PQ4szIfHtyHJxr14VGHnE'; // "5. 총괄업무일지"
export const CERTIFICATE_LEDGER_SHEET_ID = '1asT0KYMbL0Mw28YtQjrwFWW8ViD19TDY1bV2E_1ypio'; // "6. 증명서·상장 발급대장" — 승인 확정된 건만 append(감사/위변조 확인용, 앱이 다시 읽지는 않음)
export const DUTY_LEDGER_SHEET_ID = '1HqSw3KinUz3s7z9L7c9HOPDKlF3VMOAuYwEAJsxI_W0'; // "7. 당직근무대장" — 근무일지 작성(서명) 완료된 건만 append(감사/위변조 확인용, 앱이 다시 읽지는 않음)
export const DOCUMENT_INDEX_SHEET_ID = '1-0v-z7UHGkWIv0uMSRz40hXm0jg5rxr6C4lnbp6Z5n0'; // "8. 색인목록"
export const STAFF_MEETING_SHEET_ID = '1PnNETTJR_WnBWbZQVAjZmSG-ww1UKseQ05H-j-6BF4M'; // "전체회의자료"
export const LABOR_COUNCIL_SHEET_ID = '1GI6iV82JJjE0E3pdoH4tg0GH8isvr2DKrcvH2wfKeag'; // "10. 노사협의회"

export const TEAM_LIST_SHEET_NAME = '팀목록';
export const POSITION_LIST_SHEET_NAME = '직급목록';
export const APPROVAL_LINE_SHEET_NAME = '결재라인';

// Drive 업로드 폴더 (업무포털 공유 드라이브 폴더 안에 위치, Code.js와 동일한 폴더 재사용)
export const ITEM_CHECK_PHOTO_FOLDER_ID = '1p3VMhrkWf0vadUeOqgf1eARyG4itcH3n';
export const STAFF_STAMP_FOLDER_ID = '1amadx4xhlIISS4Yxn6wO0ebEd9p7EmWa';
export const DUTY_SIGNATURE_FOLDER_ID = '1qThex3gbk7I-2Y5xDUC-IK58EHDOqzTI'; // "당직싸인이미지업로드" (공유 드라이브 — files.create에 supportsAllDrives 필요)
export const CERTIFICATE_ARCHIVE_FOLDER_ID = '1taK8BLFjYPYHogLuQggh-pjfegaGVhPO'; // "증명서.상장 발급내역 원본" — 발급된 PDF 원본 보관 루트, 연도별 하위폴더는 그 아래 생성
