import { getSheetGid, getSheetsClient } from './client';
import { STAFF_SHEET_ID, TEAM_LIST_SHEET_NAME } from './sheetIds';

const DATA_START_ROW = 3; // 1행 제목(병합), 2행 헤더, 3행부터 데이터 — 시트 전체 공통 규약

export async function getTeamListFromSheet(): Promise<string[]> {
  const res = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId: STAFF_SHEET_ID,
    range: `${TEAM_LIST_SHEET_NAME}!A${DATA_START_ROW}:A`,
  });
  return (res.data.values ?? [])
    .map((row) => (row[0] ?? '').toString().trim())
    .filter((v) => v !== '');
}

export async function appendTeamToSheet(value: string): Promise<void> {
  const existing = await getTeamListFromSheet();
  if (existing.includes(value)) {
    throw new Error(`이미 등록된 값입니다: ${value}`);
  }
  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId: STAFF_SHEET_ID,
    range: `${TEAM_LIST_SHEET_NAME}!A${DATA_START_ROW}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value, '']] },
  });
}

export async function deleteTeamFromSheet(value: string): Promise<void> {
  const values = await getTeamListFromSheet();
  const idx = values.indexOf(value);
  if (idx === -1) {
    throw new Error(`삭제할 항목을 찾을 수 없습니다: ${value}`);
  }
  const dupCount = values.filter((v) => v === value).length;
  if (dupCount > 1) {
    console.warn(`[팀목록] 중복된 값 발견 (${dupCount}건): ${value} — 첫 번째 행만 삭제합니다.`);
  }

  const gid = await getSheetGid(STAFF_SHEET_ID, TEAM_LIST_SHEET_NAME);
  const rowIndex0 = DATA_START_ROW - 1 + idx; // 0-based row index for the Sheets API

  await getSheetsClient().spreadsheets.batchUpdate({
    spreadsheetId: STAFF_SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: gid,
              dimension: 'ROWS',
              startIndex: rowIndex0,
              endIndex: rowIndex0 + 1,
            },
          },
        },
      ],
    },
  });
}

export async function moveTeamInSheet(value: string, direction: 'up' | 'down'): Promise<void> {
  const values = await getTeamListFromSheet();
  const idx = values.indexOf(value);
  if (idx === -1) {
    throw new Error(`이동할 항목을 찾을 수 없습니다: ${value}`);
  }
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= values.length) return;

  const reordered = values.slice();
  [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];

  await getSheetsClient().spreadsheets.values.update({
    spreadsheetId: STAFF_SHEET_ID,
    range: `${TEAM_LIST_SHEET_NAME}!A${DATA_START_ROW}:A${DATA_START_ROW + reordered.length - 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: reordered.map((v) => [v]) },
  });
}
