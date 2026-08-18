import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { STAFF_MEETING_VALUE_TABLE } from '@/lib/sheets/registry';

// 일회성 설정 라우트 — 실행 후 삭제할 것. 전체회의업무보고 탭에 새로 추가된 "발표포함"
// 헤더 라벨을 맨 뒤 컬럼(J2)에 채운다(Supabase 컬럼 추가는 별도로 SQL Editor에서 실행).
export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const endCol = String.fromCharCode(65 + STAFF_MEETING_VALUE_TABLE.headers.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId: STAFF_MEETING_VALUE_TABLE.spreadsheetId,
      range: `${STAFF_MEETING_VALUE_TABLE.sheetName}!${endCol}2:${endCol}2`,
      valueInputOption: 'RAW',
      requestBody: { values: [['발표포함']] },
    });

    return NextResponse.json({ result: 'ok', 헤더컬럼: endCol });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
