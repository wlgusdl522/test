import { getFirstSheetTitle, getSheetsClient } from './client';

// 증명서/상장, 당직근무 등 "Supabase가 원본, 확정된 시점의 스냅샷만 append"하는 대장류 시트 공용 헬퍼.
// 앱은 이 시트를 다시 읽지 않는다 — 감사/위변조 확인용 단방향 사본이다.

export async function countLedgerDataRows(spreadsheetId: string): Promise<number> {
  const sheetTitle = await getFirstSheetTitle(spreadsheetId);
  const res = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A:A`,
  });
  const rows = res.data.values ?? [];
  return Math.max(0, rows.length - 1); // 1행은 헤더
}

export async function appendLedgerRow(spreadsheetId: string, row: (string | number)[]): Promise<void> {
  const sheetTitle = await getFirstSheetTitle(spreadsheetId);
  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTitle}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}
