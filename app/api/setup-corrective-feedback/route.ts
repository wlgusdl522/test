import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { upsertKeyedRecords } from '@/lib/mutate/keyedTable';
import {
  BOARD_STAT_VALUE_TABLE, BOARD_ADMIN_NOTE_TABLE, BOARD_BUDGET_ITEM_TABLE, BOARD_BUDGET_VALUE_TABLE,
  BOARD_STAT_ITEM_TABLE,
} from '@/lib/sheets/registry';
import { FACILITIES, getModuleItems } from '@/lib/mutate/boardStat';
import { getBudgetItems } from '@/lib/mutate/boardBudgetExecution';

// 일회성 스키마 보정 라우트 — 실행 후 삭제할 것.
// 1) 이사회월별값에 '비고' 컬럼 추가(실인원용), 이사회행정사항에 '요약포함'/'요약내용' 컬럼 추가.
// 2) 예산집행현황 전용 시트(이사회예산항목/이사회예산집행값) 새로 생성.
// 3) 실인원 기본 사업구분 11개, 시설별 예산집행 기본 항목 8개씩 시드.
// 항목마다 addModuleItem/addBudgetItem을 반복 호출하면 건별로 Sheets API 왕복(조회+추가+재조회)이
// 발생해서 항목 수만큼 호출이 늘어난다 — 실제로 이 방식으로 처음 만들었다가 "분당 읽기 요청 한도
// 초과"로 실패했다. 그래서 여기서는 시설/모듈별로 신규 레코드를 한 번에 모아 upsertKeyedRecords
// 하나씩만 호출한다(후원 저장 때 겪은 문제와 완전히 같은 원인 — boardDonation.ts 참고).
const HEADCOUNT_DEFAULTS = [
  '상담/노년사회화교육/건강지원/도서실', '사례관리사업', '나눔참여사업(자원봉사)/노인자원봉사활성화사업',
  '지역복지활성화사업', '취업알선사업', '노인일자리 및 사회활동지원사업', '노인자살예방센터',
  '노인맞춤돌봄서비스사업', '영양지원사업', '요양센터', '데이케어센터',
];
const BUDGET_ITEM_DEFAULTS = ['인건비', '업무추진비', '운영비', '재산조성비', '기능보강사업비', '사업비', '후원사업비', '잡지출 등'];

function colLetter(n: number): string {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const results: Record<string, unknown> = {};
    const sheets = getSheetsClient();

    // 1) 기존 시트에 컬럼 추가(맨 뒤라 기존 데이터 위치는 안 밀림) — 이미 추가돼 있어도 같은 값을
    // 덮어쓸 뿐이라 재실행해도 안전하다.
    await sheets.spreadsheets.values.update({
      spreadsheetId: BOARD_STAT_VALUE_TABLE.spreadsheetId,
      range: `${BOARD_STAT_VALUE_TABLE.sheetName}!${colLetter(BOARD_STAT_VALUE_TABLE.headers.length)}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [['비고']] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: BOARD_ADMIN_NOTE_TABLE.spreadsheetId,
      range: `${BOARD_ADMIN_NOTE_TABLE.sheetName}!${colLetter(BOARD_ADMIN_NOTE_TABLE.headers.length - 1)}2:${colLetter(BOARD_ADMIN_NOTE_TABLE.headers.length)}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [['요약포함', '요약내용']] },
    });
    results.columns = '이사회월별값(비고), 이사회행정사항(요약포함/요약내용) 추가 완료';

    // 2) 새 시트 생성(이미 있으면 건너뜀)
    const spreadsheetId = BOARD_BUDGET_ITEM_TABLE.spreadsheetId;
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const 실제탭목록 = (meta.data.sheets ?? []).map((s) => s.properties?.title);
    for (const table of [BOARD_BUDGET_ITEM_TABLE, BOARD_BUDGET_VALUE_TABLE]) {
      if (!실제탭목록.includes(table.sheetName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: table.sheetName } } }] },
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${table.sheetName}!A2:${colLetter(table.headers.length)}2`,
          valueInputOption: 'RAW',
          requestBody: { values: [table.headers] },
        });
      }
    }
    results.sheets = '이사회예산항목/이사회예산집행값 생성 완료(있으면 유지)';

    // 3) 기본 항목 시드 — 이름 기준으로 이미 있는 것만 건너뛴다(중간에 quota 에러로 멈췄던 이전
    // 실행이 일부만 넣어놨어도, 남은 것만 마저 채우고 중복 추가는 안 하도록 재실행에 안전하게).
    const existingHeadcount = await getModuleItems('실인원');
    const existingHeadcountNames = new Set(existingHeadcount.map((i) => i.항목명));
    const missingHeadcount = HEADCOUNT_DEFAULTS.filter((n) => !existingHeadcountNames.has(n));
    if (missingHeadcount.length > 0) {
      const nextOrder = Math.max(0, ...existingHeadcount.map((i) => i.정렬순서)) + 1;
      const items = missingHeadcount.map((name, i) => {
        const id = randomUUID();
        const record = { id, 모듈: '실인원', 항목명: name, 정렬순서: String(nextOrder + i), 시설: '', 구분: '', 그룹: '' };
        return { keyValues: { id }, record };
      });
      await upsertKeyedRecords(BOARD_STAT_ITEM_TABLE, items);
    }
    results.실인원항목 = missingHeadcount.length > 0 ? `${missingHeadcount.length}건 시드` : '이미 전부 존재';

    const budgetSeedResult: Record<string, string> = {};
    const budgetItemsToInsert: { keyValues: Record<string, string>; record: Record<string, string> }[] = [];
    for (const f of FACILITIES) {
      const existing = await getBudgetItems(f);
      const existingNames = new Set(existing.map((i) => i.항목명));
      const missing = BUDGET_ITEM_DEFAULTS.filter((n) => !existingNames.has(n));
      if (missing.length > 0) {
        const nextOrder = Math.max(0, ...existing.map((i) => i.정렬순서)) + 1;
        missing.forEach((name, i) => {
          const id = randomUUID();
          budgetItemsToInsert.push({ keyValues: { id }, record: { id, 시설: f, 항목명: name, 정렬순서: String(nextOrder + i) } });
        });
        budgetSeedResult[f] = `${missing.length}건 시드`;
      } else {
        budgetSeedResult[f] = '이미 전부 존재';
      }
    }
    if (budgetItemsToInsert.length > 0) await upsertKeyedRecords(BOARD_BUDGET_ITEM_TABLE, budgetItemsToInsert);
    results.예산집행항목 = budgetSeedResult;

    return NextResponse.json({ result: 'ok', ...results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
