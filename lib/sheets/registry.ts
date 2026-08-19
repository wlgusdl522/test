import type { KeyedTableConfig } from './keyedTable';
import {
  CARD_LEDGER_SHEET_ID,
  DOCUMENT_INDEX_SHEET_ID,
  STAFF_MEETING_SHEET_ID,
  STAFF_SHEET_ID,
  VEHICLE_SHEET_ID,
  WEEKLY_PLAN_SHEET_ID,
  WORKLOG_SHEET_ID,
} from './sheetIds';

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
// 시설/구분/그룹은 회계 전용(시설마다 항목 구성이 다르고, 수입/지출 그룹별 소계가 필요해서 추가) —
// 기존 자원봉사자/후원 항목은 이 3개 컬럼을 안 쓰므로 빈 값으로 둔다. 맨 뒤에 추가한 이유는
// 이미 쌓여있던 기존 항목 행들의 앞쪽 컬럼(항목명/정렬순서) 위치가 밀리지 않게 하기 위함.
export const BOARD_STAT_ITEM_HEADERS = ['id', '모듈', '항목명', '정렬순서', '시설', '구분', '그룹'];

export const BOARD_STAT_ITEM_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회항목',
  headers: BOARD_STAT_ITEM_HEADERS,
  primaryKey: 'id',
};

// 회계 "예금잔액명세" — 계좌 메타데이터(은행명/계좌번호/비고)는 거의 안 바뀌는 마스터,
// 매달 바뀌는 잔액값은 이사회월별값(항목ID 자리에 계좌 id를 그대로 재사용)에 저장한다.
export const BOARD_BANK_ACCOUNT_HEADERS = ['id', '시설', '은행명', '계좌번호', '비고', '정렬순서'];

export const BOARD_BANK_ACCOUNT_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회예금계좌',
  headers: BOARD_BANK_ACCOUNT_HEADERS,
  primaryKey: 'id',
};

// 시설: 회계/후원은 복지관/요양센터/데이케어센터가 서로 다른 값을 가지므로 항목ID+년월에 더해
// 시설까지 키로 잡는다. 자원봉사자처럼 시설 구분이 없는 모듈은 '전체' 고정값을 쓴다.
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
// 요약포함: "요약 업무보고"(커버 요약본)에 이 행을 하이라이트로 넣을지 담당자가 직접 체크 —
// 기존 컬럼 위치가 밀리지 않도록 맨 뒤에 추가.
export const BOARD_PLAN_HEADERS = ['id', '사업명', '실시월일', '내용', '기대효과', '정렬순서', '구분', '년월', '요약포함'];

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

// 후원 상세 명단 — 후원금(성명+금액+비고)과 후원물품(품목+수량+환가액+후원자+지급대상)이
// 컬럼이 서로 달라서, 둘을 한 테이블에 합치되 안 쓰는 컬럼은 비워둔다(항목 값으로 구분).
export const BOARD_DONATION_DETAIL_HEADERS = [
  'id', '항목', '시설', '년월', '이름', '수량', '금액', '후원자', '지급대상', '비고', '정렬순서',
];

export const BOARD_DONATION_DETAIL_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회후원상세',
  headers: BOARD_DONATION_DETAIL_HEADERS,
  primaryKey: 'id',
};

// 자원봉사 항목별 명단(이름) — 구분은 자유 텍스트(예: 새문안교회 등 특정 단체명)이고, 비어있으면 일반으로 취급한다.
export const BOARD_ROSTER_HEADERS = ['id', '항목ID', '년월', '구분', '이름', '정렬순서'];

export const BOARD_ROSTER_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회명단',
  headers: BOARD_ROSTER_HEADERS,
  primaryKey: 'id',
};

// 요약 업무보고 "8. 행정사항" — 월별로 자유롭게 줄글을 몇 줄 적어 넣는 목록(업무보고 표와 같은
// "행 추가 후 저장" 방식). 항목/그룹 구분이 필요 없어 이사회항목과는 별도의 단순 테이블로 둔다.
export const BOARD_ADMIN_NOTE_HEADERS = ['id', '년월', '내용', '정렬순서'];

export const BOARD_ADMIN_NOTE_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회행정사항',
  headers: BOARD_ADMIN_NOTE_HEADERS,
  primaryKey: 'id',
};

// 사업실적 "실인원 산출내역" — 특정 기준일 하나(그 달 안에서 관리자가 고른 날짜) + 사업구분별
// 실인원 수 목록. 기준일은 월 하나에 값 하나뿐이라 이사회기간설정과 같은 결로 별도 단순 테이블.
export const BOARD_HEADCOUNT_HEADERS = ['id', '년월', '사업구분', '실인원', '비고', '정렬순서'];

export const BOARD_HEADCOUNT_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회실인원',
  headers: BOARD_HEADCOUNT_HEADERS,
  primaryKey: 'id',
};

export const BOARD_HEADCOUNT_DATE_HEADERS = ['년월', '기준일'];

export const BOARD_HEADCOUNT_DATE_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회실인원기준일',
  headers: BOARD_HEADCOUNT_DATE_HEADERS,
  primaryKey: '년월',
};

// 회계 "예산집행현황" — 항목별(인건비/업무추진비/운영비/재산조성비/기능보강사업비/사업비/
// 후원사업비/잡지출 등) 연간 예산액만 관리자가 입력하고, 집행액/누계/집행률은 이미 있는
// 수입지출현황 지출 데이터에서 규칙 기반으로 계산한다(lib/mutate/boardBudgetExecution.ts).
// "사업비"는 기본사업비/특정보조사업비로 더 세분화해야 하는데, 세부항목별로 재원이 자체재원인지
// 보조금인지는 회계담당자만 판단 가능해서(이름만으로 추론 불가) 지금은 한 카테고리로 묶어두고
// 나중에 분류 기준이 정해지면 나눈다.
export const BOARD_BUDGET_AMOUNT_HEADERS = ['시설', '카테고리', '연도', '예산액'];

export const BOARD_BUDGET_AMOUNT_TABLE: KeyedTableConfig = {
  spreadsheetId: WORKLOG_SHEET_ID,
  sheetName: '이사회예산액',
  headers: BOARD_BUDGET_AMOUNT_HEADERS,
  primaryKey: ['시설', '카테고리', '연도'],
};

// 업무관리 "색인목록"(공문 등록대장) — 팀마다 문서번호 계열(접두사+일련번호)을 독립적으로 관리한다.
// 문서번호는 등록 시점에 완성해서 그대로 저장한다(나중에 접두사를 바꿔도 과거 문서번호 텍스트는
// 안 바뀌어야 하므로). "스탬프 결재"(문서번호가 필요 없는 내부결재)는 일련번호/문서번호가 빈 값이고
// 일련번호 카운터도 그 항목 때문에 증가하지 않는다.
export const DOCUMENT_INDEX_HEADERS = [
  'id', '팀명', '연도', '권', '구분', '일련번호', '문서번호', '제목', '월일', '수신', '발신',
  '정렬순서', '등록일시', '작성자이메일', '작성자명',
];

export const DOCUMENT_INDEX_TABLE: KeyedTableConfig = {
  spreadsheetId: DOCUMENT_INDEX_SHEET_ID,
  sheetName: '색인목록',
  headers: DOCUMENT_INDEX_HEADERS,
  primaryKey: 'id',
};

// 팀+연도별 채번 상태. "새 권 시작" 버튼은 현재권만 +1 하고 다음일련번호는 건드리지 않는다
// (일련번호는 연도가 바뀌면 1로 리셋되지만, 같은 연도 안에서는 권이 바뀌어도 이어진다).
export const DOCUMENT_INDEX_STATE_HEADERS = ['팀명', '연도', '현재권', '다음일련번호'];

export const DOCUMENT_INDEX_STATE_TABLE: KeyedTableConfig = {
  spreadsheetId: DOCUMENT_INDEX_SHEET_ID,
  sheetName: '색인목록상태',
  headers: DOCUMENT_INDEX_STATE_HEADERS,
  primaryKey: ['팀명', '연도'],
};

// 팀별 문서번호 접두사(예: 서노복102A) — 팀마다 전체 문자열을 설정 화면에서 직접 입력해 관리한다.
export const DOCUMENT_INDEX_PREFIX_HEADERS = ['팀명', '접두사'];

export const DOCUMENT_INDEX_PREFIX_TABLE: KeyedTableConfig = {
  spreadsheetId: DOCUMENT_INDEX_SHEET_ID,
  sheetName: '색인목록접두사',
  headers: DOCUMENT_INDEX_PREFIX_HEADERS,
  primaryKey: '팀명',
};

// 업무관리 "전체회의자료" — 원래 팀별로 구글슬라이드 한 장씩 만들던 것을 포털로 이관.
// 사업구분(예: 시설관리, 운영지원사업)은 팀마다 고정 목록으로 미리 등록해두고, 매달 값(이번달
// 업무보고/다음달 업무계획/타 부서 협조사항)만 채운다.
export const STAFF_MEETING_ITEM_HEADERS = ['id', '팀명', '사업구분', '정렬순서'];

export const STAFF_MEETING_ITEM_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_MEETING_SHEET_ID,
  sheetName: '전체회의사업구분',
  headers: STAFF_MEETING_ITEM_HEADERS,
  primaryKey: 'id',
};

// 사업구분ID가 이미 팀을 유일하게 특정하지만, 다른 값 테이블들(이사회월별값 등)과 같은 관례로
// 팀명도 키에 함께 둔다(조회 편의).
export const STAFF_MEETING_VALUE_HEADERS = [
  '사업구분ID', '팀명', '년월', '업무보고', '업무계획', '협조사항', '작성자이메일', '작성자명', '등록일시',
];

export const STAFF_MEETING_VALUE_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_MEETING_SHEET_ID,
  sheetName: '전체회의업무보고',
  headers: STAFF_MEETING_VALUE_HEADERS,
  primaryKey: ['사업구분ID', '팀명', '년월'],
};

// 회의 자체의 메타정보(일시/장소/진행/참석부서) — 서무가 매달 회의 일정에 맞게 등록한다.
// 알림발송일시: 크론이 잔디 알림을 보낸 뒤 채워서 같은 날 중복 발송을 막는다(맨 뒤에 추가).
export const STAFF_MEETING_INFO_HEADERS = [
  '년월', '회의일시', '장소', '진행', '참석부서', '알림일수전', '알림발송일시',
];

export const STAFF_MEETING_INFO_TABLE: KeyedTableConfig = {
  spreadsheetId: STAFF_MEETING_SHEET_ID,
  sheetName: '전체회의정보',
  headers: STAFF_MEETING_INFO_HEADERS,
  primaryKey: '년월',
};
