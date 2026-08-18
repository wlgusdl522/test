import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { BOARD_STAT_ITEM_TABLE, BOARD_BANK_ACCOUNT_TABLE } from '@/lib/sheets/registry';

// 일회성 설정 라우트 — 실행 후 삭제할 것.
// 1) '이사회항목' 헤더 행(2행) 끝에 새로 추가된 시설/구분/그룹 컬럼 라벨을 채운다(E2:G2 —
//    코드는 registry.ts의 헤더 배열을 그대로 신뢰해서 동작하므로 필수는 아니지만, 시트를 직접
//    열어보는 사람이 이해하기 쉽게 라벨을 남겨둔다).
// 2) '이사회예금계좌' 탭이 없으면 새로 만든다.
export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const spreadsheetId = BOARD_STAT_ITEM_TABLE.spreadsheetId;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${BOARD_STAT_ITEM_TABLE.sheetName}!E2:G2`,
      valueInputOption: 'RAW',
      requestBody: { values: [['시설', '구분', '그룹']] },
    });

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const 실제탭목록 = (meta.data.sheets ?? []).map((s) => s.properties?.title);
    let bankSheetResult: 'exists' | 'created' = 'exists';
    if (!실제탭목록.includes(BOARD_BANK_ACCOUNT_TABLE.sheetName)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: BOARD_BANK_ACCOUNT_TABLE.sheetName } } }] },
      });
      const endCol = String.fromCharCode(65 + BOARD_BANK_ACCOUNT_TABLE.headers.length - 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${BOARD_BANK_ACCOUNT_TABLE.sheetName}!A2:${endCol}2`,
        valueInputOption: 'RAW',
        requestBody: { values: [BOARD_BANK_ACCOUNT_TABLE.headers] },
      });
      bankSheetResult = 'created';
    }

    return NextResponse.json({ result: 'ok', 이사회항목헤더: 'updated', 이사회예금계좌: bankSheetResult });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
