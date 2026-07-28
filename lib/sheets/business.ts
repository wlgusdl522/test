import { getSheetGid, getSheetsClient } from './client';
import { STAFF_SHEET_ID } from './sheetIds';

export const BUSINESS_LIST_SHEET_NAME = '사업목록';
const DATA_START_ROW = 3;

export type BusinessItem = { name: string; team: string };

export async function getBusinessListFromSheet(): Promise<BusinessItem[]> {
  const res = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId: STAFF_SHEET_ID,
    range: `${BUSINESS_LIST_SHEET_NAME}!A${DATA_START_ROW}:B`,
  });
  return (res.data.values ?? [])
    .filter((row) => row[0])
    .map((row) => ({ name: String(row[0]).trim(), team: (row[1] ?? '').toString().trim() }));
}

export async function appendBusinessToSheet(name: string, team: string): Promise<void> {
  const existing = await getBusinessListFromSheet();
  if (existing.some((b) => b.name === name)) {
    throw new Error(`이미 등록된 사업명입니다: ${name}`);
  }
  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId: STAFF_SHEET_ID,
    range: `${BUSINESS_LIST_SHEET_NAME}!A${DATA_START_ROW}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[name, team, '']] },
  });
}

export async function deleteBusinessFromSheet(name: string): Promise<void> {
  const items = await getBusinessListFromSheet();
  const idx = items.findIndex((b) => b.name === name);
  if (idx === -1) {
    throw new Error(`삭제할 사업을 찾을 수 없습니다: ${name}`);
  }
  const dupCount = items.filter((b) => b.name === name).length;
  if (dupCount > 1) {
    console.warn(`[사업목록] 중복된 사업명 발견 (${dupCount}건): ${name} — 첫 번째 행만 삭제합니다.`);
  }

  const gid = await getSheetGid(STAFF_SHEET_ID, BUSINESS_LIST_SHEET_NAME);
  const rowIndex0 = DATA_START_ROW - 1 + idx;

  await getSheetsClient().spreadsheets.batchUpdate({
    spreadsheetId: STAFF_SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId: gid, dimension: 'ROWS', startIndex: rowIndex0, endIndex: rowIndex0 + 1 },
          },
        },
      ],
    },
  });
}
