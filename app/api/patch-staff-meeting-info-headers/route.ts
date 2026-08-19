import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { STAFF_MEETING_INFO_TABLE } from '@/lib/sheets/registry';

// 일회성 패치 라우트 — 실행 후 삭제할 것. 전체회의정보 탭은 이미 만들어져 있었는데
// 업무보고기간/업무계획기간 두 컬럼을 헤더 맨 뒤에 추가했으므로 헤더 행만 다시 덮어쓴다.
export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const spreadsheetId = STAFF_MEETING_INFO_TABLE.spreadsheetId;
    const endCol = String.fromCharCode(65 + STAFF_MEETING_INFO_TABLE.headers.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${STAFF_MEETING_INFO_TABLE.sheetName}!A2:${endCol}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [STAFF_MEETING_INFO_TABLE.headers] },
    });

    return NextResponse.json({ result: 'ok', headers: STAFF_MEETING_INFO_TABLE.headers });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
