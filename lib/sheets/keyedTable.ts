import { getSheetGid, getSheetsClient } from './client';

export type KeyedTableConfig = {
  spreadsheetId: string;
  sheetName: string;
  headers: string[];
  primaryKey: string | string[];
};

const DATA_START_ROW = 3; // 1행 제목(병합), 2행 헤더, 3행부터 데이터 — 시트 전체 공통 규약

function keyColumns(config: KeyedTableConfig): string[] {
  return Array.isArray(config.primaryKey) ? config.primaryKey : [config.primaryKey];
}

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

function recordToRow(config: KeyedTableConfig, record: Record<string, string>): string[] {
  return config.headers.map((h) => record[h] ?? '');
}

function rowToRecord(config: KeyedTableConfig, row: unknown[]): Record<string, string> {
  const rec: Record<string, string> = {};
  config.headers.forEach((h, i) => {
    rec[h] = (row[i] ?? '').toString();
  });
  return rec;
}

async function getRawRows(config: KeyedTableConfig): Promise<string[][]> {
  const res = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A${DATA_START_ROW}:${colLetter(config.headers.length)}`,
  });
  return (res.data.values ?? []) as string[][];
}

function matchesKey(config: KeyedTableConfig, row: string[], keyValues: Record<string, string>): boolean {
  return keyColumns(config).every((col) => {
    const idx = config.headers.indexOf(col);
    return String(row[idx] ?? '').trim() === String(keyValues[col] ?? '').trim();
  });
}

function findRowIndex(config: KeyedTableConfig, rows: string[][], keyValues: Record<string, string>): number {
  const matches: number[] = [];
  rows.forEach((row, i) => {
    if (row[0] && matchesKey(config, row, keyValues)) matches.push(i);
  });
  if (matches.length > 1) {
    console.warn(
      `[${config.sheetName}] 중복 키 발견 (${matches.length}건): ${JSON.stringify(keyValues)} — 첫 번째 행만 사용합니다.`
    );
  }
  return matches.length > 0 ? matches[0] : -1;
}

export async function getAllRecords(config: KeyedTableConfig): Promise<Record<string, string>[]> {
  const rows = await getRawRows(config);
  return rows.filter((row) => row[0]).map((row) => rowToRecord(config, row));
}

export async function appendRecord(config: KeyedTableConfig, record: Record<string, string>): Promise<void> {
  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A${DATA_START_ROW}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [recordToRow(config, record)] },
  });
}

export async function updateRecord(
  config: KeyedTableConfig,
  keyValues: Record<string, string>,
  record: Record<string, string>
): Promise<void> {
  const rows = await getRawRows(config);
  const idx = findRowIndex(config, rows, keyValues);
  if (idx === -1) {
    throw new Error(`수정할 항목을 찾을 수 없습니다: ${JSON.stringify(keyValues)}`);
  }
  const rowNumber = DATA_START_ROW + idx;
  await getSheetsClient().spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A${rowNumber}:${colLetter(config.headers.length)}${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [recordToRow(config, record)] },
  });
}

export async function upsertRecord(
  config: KeyedTableConfig,
  keyValues: Record<string, string>,
  record: Record<string, string>
): Promise<void> {
  const rows = await getRawRows(config);
  const idx = findRowIndex(config, rows, keyValues);
  if (idx === -1) {
    await appendRecord(config, record);
  } else {
    const rowNumber = DATA_START_ROW + idx;
    await getSheetsClient().spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A${rowNumber}:${colLetter(config.headers.length)}${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [recordToRow(config, record)] },
    });
  }
}

export async function deleteRecord(config: KeyedTableConfig, keyValues: Record<string, string>): Promise<void> {
  const rows = await getRawRows(config);
  const idx = findRowIndex(config, rows, keyValues);
  if (idx === -1) {
    throw new Error(`삭제할 항목을 찾을 수 없습니다: ${JSON.stringify(keyValues)}`);
  }
  const gid = await getSheetGid(config.spreadsheetId, config.sheetName);
  const rowIndex0 = DATA_START_ROW - 1 + idx;
  await getSheetsClient().spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
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
