import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { STAFF_MEETING_TEAM_ORDER_TABLE } from '@/lib/sheets/registry';

// 일회성 설정 라우트 — 실행 후 삭제할 것. 전체회의발표순서 탭이 없으면 새로 만든다.
export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const spreadsheetId = STAFF_MEETING_TEAM_ORDER_TABLE.spreadsheetId;
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const 실제탭목록 = (meta.data.sheets ?? []).map((s) => s.properties?.title);

    if (실제탭목록.includes(STAFF_MEETING_TEAM_ORDER_TABLE.sheetName)) {
      return NextResponse.json({ result: 'ok', tab: 'exists' });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: STAFF_MEETING_TEAM_ORDER_TABLE.sheetName } } }] },
    });
    const endCol = String.fromCharCode(65 + STAFF_MEETING_TEAM_ORDER_TABLE.headers.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${STAFF_MEETING_TEAM_ORDER_TABLE.sheetName}!A2:${endCol}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [STAFF_MEETING_TEAM_ORDER_TABLE.headers] },
    });

    return NextResponse.json({ result: 'ok', tab: 'created' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
