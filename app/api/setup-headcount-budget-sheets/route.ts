import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { BOARD_HEADCOUNT_TABLE, BOARD_HEADCOUNT_DATE_TABLE, BOARD_BUDGET_AMOUNT_TABLE } from '@/lib/sheets/registry';

// 일회성 설정 라우트 — 실행 후 삭제할 것. 이사회실인원/이사회실인원기준일/이사회예산액
// 탭이 없으면 새로 만든다.
const TABLES = [BOARD_HEADCOUNT_TABLE, BOARD_HEADCOUNT_DATE_TABLE, BOARD_BUDGET_AMOUNT_TABLE];

export async function GET() {
  try {
    const email = await requireViewerEmail();
    if (!(await isAdminEmail(email))) {
      return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
    }

    const sheets = getSheetsClient();
    const spreadsheetId = TABLES[0].spreadsheetId;
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const 실제탭목록 = (meta.data.sheets ?? []).map((s) => s.properties?.title);

    const results: Record<string, 'exists' | 'created'> = {};
    for (const table of TABLES) {
      if (실제탭목록.includes(table.sheetName)) {
        results[table.sheetName] = 'exists';
        continue;
      }
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: table.sheetName } } }] },
      });
      const endCol = String.fromCharCode(65 + table.headers.length - 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${table.sheetName}!A2:${endCol}2`,
        valueInputOption: 'RAW',
        requestBody: { values: [table.headers] },
      });
      results[table.sheetName] = 'created';
    }

    return NextResponse.json({ result: 'ok', tabs: results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
