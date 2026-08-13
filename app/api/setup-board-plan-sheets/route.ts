import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import {
  BOARD_PLAN_HEADERS, BOARD_PLAN_TABLE,
  BOARD_STAT_ITEM_HEADERS, BOARD_STAT_ITEM_TABLE,
  BOARD_STAT_VALUE_HEADERS, BOARD_STAT_VALUE_TABLE,
} from '@/lib/sheets/registry';

// 일회성 시딩 라우트 — 실행 후 삭제할 것.
// "이사회항목"/"이사회월별값" 탭이 실제 스프레드시트에 없는 것으로 확인돼(생성 이력은
// 있었지만 그 사이 사라짐, 데이터도 없었음) 마이그레이션 없이 최신 헤더(시설 포함)로
// 셋 다 그냥 다시 만든다. 이미 있으면 손대지 않는다(ensureSheet가 존재 여부부터 확인).

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
    spreadsheetId, range: `${sheetName}!A1`, valueInputOption: 'RAW', requestBody: { values: [[sheetName]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${sheetName}!A2:${lastCol}2`, valueInputOption: 'RAW', requestBody: { values: [headers] },
  });

  const meta2 = await sheets.spreadsheets.get({ spreadsheetId });
  const gid = meta2.data.sheets?.find((s) => s.properties?.title === sheetName)?.properties?.sheetId;
  if (gid !== undefined && gid !== null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ mergeCells: { range: { sheetId: gid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length }, mergeType: 'MERGE_ALL' } }],
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

  try {
    const item = await ensureSheet(BOARD_STAT_ITEM_TABLE.spreadsheetId, BOARD_STAT_ITEM_TABLE.sheetName, BOARD_STAT_ITEM_HEADERS);
    const value = await ensureSheet(BOARD_STAT_VALUE_TABLE.spreadsheetId, BOARD_STAT_VALUE_TABLE.sheetName, BOARD_STAT_VALUE_HEADERS);
    const plan = await ensureSheet(BOARD_PLAN_TABLE.spreadsheetId, BOARD_PLAN_TABLE.sheetName, BOARD_PLAN_HEADERS);
    return NextResponse.json({ 이사회항목: item, 이사회월별값: value, 이사회사업계획: plan });
  } catch (err) {
    console.error('[setup-board-plan-sheets]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined },
      { status: 500 }
    );
  }
}
