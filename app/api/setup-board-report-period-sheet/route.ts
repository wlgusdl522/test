import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { BOARD_REPORT_PERIOD_TABLE } from '@/lib/sheets/registry';

// 일회성 설정 라우트 — 실행 후 삭제할 것. 이사회자료 업무보고의 기간 설정을 저장할
// '이사회기간설정' 탭이 스프레드시트에 없으면 새로 만든다(이미 있으면 그대로 둔다).
export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const spreadsheetId = BOARD_REPORT_PERIOD_TABLE.spreadsheetId;
    const sheetName = BOARD_REPORT_PERIOD_TABLE.sheetName;

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const 실제탭목록 = (meta.data.sheets ?? []).map((s) => s.properties?.title);
    if (실제탭목록.includes(sheetName)) {
      return NextResponse.json({ result: 'exists', 실제탭목록 });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
    const endCol = String.fromCharCode(65 + BOARD_REPORT_PERIOD_TABLE.headers.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A2:${endCol}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [BOARD_REPORT_PERIOD_TABLE.headers] },
    });

    return NextResponse.json({ result: 'created', sheetName });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
