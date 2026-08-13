import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { BOARD_PLAN_HEADERS, BOARD_PLAN_TABLE, BOARD_STAT_VALUE_HEADERS, BOARD_STAT_VALUE_TABLE } from '@/lib/sheets/registry';

// 일회성 시딩/마이그레이션 라우트 — 실행 후 삭제할 것.
// 1) "이사회사업계획" 탭을 새로 만든다.
// 2) "이사회월별값" 탭에 "시설" 컬럼을 항목ID 다음 자리에 끼워 넣는다(이미 입력된 값이 있으면
//    시설값을 '전체'로 채워 마이그레이션, 없으면 헤더만 다시 씀).

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

// 기존 7컬럼(id,항목ID,년월,값,작성자이메일,작성자명,등록일시) → 새 8컬럼에
// "시설" 컬럼을 3번째 자리(항목ID 다음)에 끼워 넣는다.
async function migrateFacilityColumn(): Promise<{ header: string; rows: number }> {
  const sheets = getSheetsClient();
  const { spreadsheetId, sheetName } = BOARD_STAT_VALUE_TABLE;
  const lastColOld = colLetter(7);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A3:${lastColOld}` });
  const oldRows = (res.data.values ?? []) as string[][];

  const lastColNew = colLetter(BOARD_STAT_VALUE_HEADERS.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${sheetName}!A2:${lastColNew}2`, valueInputOption: 'RAW', requestBody: { values: [BOARD_STAT_VALUE_HEADERS] },
  });

  if (oldRows.length === 0) return { header: 'rewritten', rows: 0 };

  const newRows = oldRows.map((r) => [r[0] ?? '', r[1] ?? '', '전체', r[2] ?? '', r[3] ?? '', r[4] ?? '', r[5] ?? '', r[6] ?? '']);
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${sheetName}!A3:${lastColNew}${2 + newRows.length}`, valueInputOption: 'RAW', requestBody: { values: newRows },
  });
  return { header: 'rewritten', rows: newRows.length };
}

export async function GET() {
  const email = await requireViewerEmail();
  if (!(await isAdminEmail(email))) {
    return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
  }

  const plan = await ensureSheet(BOARD_PLAN_TABLE.spreadsheetId, BOARD_PLAN_TABLE.sheetName, BOARD_PLAN_HEADERS);
  const migration = await migrateFacilityColumn();

  return NextResponse.json({ 이사회사업계획: plan, 이사회월별값_시설컬럼: migration });
}
