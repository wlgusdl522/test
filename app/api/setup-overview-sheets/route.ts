import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { BOARD_PLAN_TABLE, BOARD_ADMIN_NOTE_TABLE } from '@/lib/sheets/registry';

// 일회성 설정 라우트 — 실행 후 삭제할 것.
// 1) '이사회사업계획' 헤더 행에 새로 추가된 "요약포함" 라벨을 채운다(I2).
// 2) '이사회행정사항' 탭이 없으면 새로 만든다.
export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const spreadsheetId = BOARD_PLAN_TABLE.spreadsheetId;
    const planEndCol = String.fromCharCode(65 + BOARD_PLAN_TABLE.headers.length - 1);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${BOARD_PLAN_TABLE.sheetName}!${planEndCol}2:${planEndCol}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [['요약포함']] },
    });

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const 실제탭목록 = (meta.data.sheets ?? []).map((s) => s.properties?.title);
    let noteSheetResult: 'exists' | 'created' = 'exists';
    if (!실제탭목록.includes(BOARD_ADMIN_NOTE_TABLE.sheetName)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: BOARD_ADMIN_NOTE_TABLE.sheetName } } }] },
      });
      const endCol = String.fromCharCode(65 + BOARD_ADMIN_NOTE_TABLE.headers.length - 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${BOARD_ADMIN_NOTE_TABLE.sheetName}!A2:${endCol}2`,
        valueInputOption: 'RAW',
        requestBody: { values: [BOARD_ADMIN_NOTE_TABLE.headers] },
      });
      noteSheetResult = 'created';
    }

    return NextResponse.json({ result: 'ok', 이사회사업계획헤더: 'updated', 이사회행정사항: noteSheetResult });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
