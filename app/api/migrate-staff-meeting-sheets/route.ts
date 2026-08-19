import { NextResponse } from 'next/server';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { getSheetsClient } from '@/lib/sheets/client';
import { getKeyedList, seedKeyedListFromSheet } from '@/lib/mutate/keyedTable';
import { STAFF_MEETING_ITEM_TABLE, STAFF_MEETING_VALUE_TABLE } from '@/lib/sheets/registry';

// 일회성 이관 라우트 — 실행 후 삭제할 것. 전체회의사업구분/전체회의업무보고를
// "5. 총괄업무일지"에서 새 스프레드시트("전체회의자료")로 옮긴다. 탭을 새로 만들고,
// 기존에 입력됐던 데이터(Supabase에 테이블명으로 남아있음, 스프레드시트 위치와 무관)를
// 그대로 옮겨 적는다.
const TABLES = [STAFF_MEETING_ITEM_TABLE, STAFF_MEETING_VALUE_TABLE];

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

    const results: Record<string, { tab: 'exists' | 'created'; 옮긴행수: number }> = {};
    for (const table of TABLES) {
      const existed = 실제탭목록.includes(table.sheetName);
      if (!existed) {
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
      }

      const records = await getKeyedList(table);
      if (records.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${table.sheetName}!A3`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: records.map((r) => table.headers.map((h) => r[h] ?? '')) },
        });
      }
      await seedKeyedListFromSheet(table);
      results[table.sheetName] = { tab: existed ? 'exists' : 'created', 옮긴행수: records.length };
    }

    return NextResponse.json({ result: 'ok', tabs: results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
