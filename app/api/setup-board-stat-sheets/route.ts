import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { BOARD_STAT_ITEM_HEADERS, BOARD_STAT_ITEM_TABLE, BOARD_STAT_VALUE_HEADERS, BOARD_STAT_VALUE_TABLE } from '@/lib/sheets/registry';

// 일회성 시딩 라우트 — 이사회자료(회계/자원봉사자/후원) 항목·값 테이블을 위한 새 시트 탭 2개를
// "5. 총괄업무일지" 스프레드시트에 만든다. 실행 후 삭제할 것 (기존 seed-business-plans와 동일한 패턴).

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

async function ensureSheet(spreadsheetId: string, sheetName: string, headers: string[]): Promise<'created' | 'exists'> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = (meta.data.sheets ?? []).find((s) => s.properties?.title === sheetName);
  if (existing) return 'exists';

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
  });

  const lastCol = colLetter(headers.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[sheetName]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A2:${lastCol}2`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  });

  const meta2 = await sheets.spreadsheets.get({ spreadsheetId });
  const gid = meta2.data.sheets?.find((s) => s.properties?.title === sheetName)?.properties?.sheetId;
  if (gid !== undefined && gid !== null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          { mergeCells: { range: { sheetId: gid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length }, mergeType: 'MERGE_ALL' } },
        ],
      },
    });
  }
  return 'created';
}

export async function GET() {
  const email = await requireViewerEmail();
  if (!(await isAdminEmail(email))) {
    return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
  }

  const item = await ensureSheet(BOARD_STAT_ITEM_TABLE.spreadsheetId, BOARD_STAT_ITEM_TABLE.sheetName, BOARD_STAT_ITEM_HEADERS);
  const value = await ensureSheet(BOARD_STAT_VALUE_TABLE.spreadsheetId, BOARD_STAT_VALUE_TABLE.sheetName, BOARD_STAT_VALUE_HEADERS);

  return NextResponse.json({ 이사회항목: item, 이사회월별값: value });
}
