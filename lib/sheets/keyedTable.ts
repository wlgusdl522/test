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
    valueInputOption: 'RAW',
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
    valueInputOption: 'RAW',
    requestBody: { values: [recordToRow(config, record)] },
  });
}

// 여러 행을 동시에 업데이트할 때 쓴다 — 행마다 updateRecord를 따로 호출하면 매번 읽기+쓰기
// 왕복이 반복돼서 대량 처리(예: 회계 일괄 인쇄) 시 요청 수가 급증해 API 한도에 걸릴 수 있다.
// 여기서는 대상 행 인덱스를 한 번에 구해서 values.batchUpdate 하나로 전부 갱신한다.
export async function updateRecords(
  config: KeyedTableConfig,
  updates: { keyValues: Record<string, string>; record: Record<string, string> }[]
): Promise<void> {
  if (updates.length === 0) return;
  const rows = await getRawRows(config);
  const data = updates.map(({ keyValues, record }) => {
    const idx = findRowIndex(config, rows, keyValues);
    if (idx === -1) throw new Error(`수정할 항목을 찾을 수 없습니다: ${JSON.stringify(keyValues)}`);
    const rowNumber = DATA_START_ROW + idx;
    return {
      range: `${config.sheetName}!A${rowNumber}:${colLetter(config.headers.length)}${rowNumber}`,
      values: [recordToRow(config, record)],
    };
  });
  await getSheetsClient().spreadsheets.values.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data },
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
      valueInputOption: 'RAW',
      requestBody: { values: [recordToRow(config, record)] },
    });
  }
}

// 엑셀 가져오기처럼 한 번에 수백 건을 넣거나 갱신할 때 쓴다 — upsertRecord를 건마다 반복하면
// 매번 시트 전체를 다시 읽어서 대량 처리 시 API 호출 한도에 걸릴 수 있다. 여기서는 대상 행
// 인덱스를 한 번에 구해서, 기존 행 갱신은 batchUpdate 하나로, 신규 행 추가는 append 하나로 처리한다.
export async function upsertRecords(
  config: KeyedTableConfig,
  items: { keyValues: Record<string, string>; record: Record<string, string> }[]
): Promise<void> {
  if (items.length === 0) return;
  const rows = await getRawRows(config);
  const updateData: { range: string; values: string[][] }[] = [];
  const toAppend: Record<string, string>[] = [];
  items.forEach(({ keyValues, record }) => {
    const idx = findRowIndex(config, rows, keyValues);
    if (idx === -1) {
      toAppend.push(record);
    } else {
      const rowNumber = DATA_START_ROW + idx;
      updateData.push({
        range: `${config.sheetName}!A${rowNumber}:${colLetter(config.headers.length)}${rowNumber}`,
        values: [recordToRow(config, record)],
      });
    }
  });
  if (updateData.length > 0) {
    await getSheetsClient().spreadsheets.values.batchUpdate({
      spreadsheetId: config.spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: updateData },
    });
  }
  if (toAppend.length > 0) {
    await getSheetsClient().spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A${DATA_START_ROW}`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: toAppend.map((r) => recordToRow(config, r)) },
    });
  }
}

export async function deleteRecord(config: KeyedTableConfig, keyValues: Record<string, string>): Promise<void> {
  return deleteRecords(config, [keyValues]);
}

// 여러 행을 한 번에 지울 때 쓴다 — 건마다 deleteRecord를 따로 호출하면 행마다 API 왕복이
// 반복돼서(읽기+batchUpdate) 대량 삭제(예: 반복 신청 "이후 전체삭제") 시 요청 수가 급증해
// Sheets API 호출 한도에 걸려 일부만 지워지고 중단될 수 있다. 여기서는 대상 행 인덱스를
// 한 번에 구해서 batchUpdate 하나로 전부 지운다.
export async function deleteRecords(config: KeyedTableConfig, keyValuesList: Record<string, string>[]): Promise<void> {
  if (keyValuesList.length === 0) return;
  const rows = await getRawRows(config);
  const indices = keyValuesList
    .map((kv) => findRowIndex(config, rows, kv))
    .filter((idx) => idx !== -1);
  if (indices.length === 0) {
    throw new Error(`삭제할 항목을 찾을 수 없습니다: ${JSON.stringify(keyValuesList)}`);
  }
  const gid = await getSheetGid(config.spreadsheetId, config.sheetName);
  // 뒤에서부터(내림차순) 지워야 이미 처리한/아직 처리할 다른 행의 인덱스가 안 밀린다.
  const sortedDesc = [...new Set(indices)].sort((a, b) => b - a);
  await getSheetsClient().spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: {
      requests: sortedDesc.map((idx) => {
        const rowIndex0 = DATA_START_ROW - 1 + idx;
        return {
          deleteDimension: {
            range: { sheetId: gid, dimension: 'ROWS', startIndex: rowIndex0, endIndex: rowIndex0 + 1 },
          },
        };
      }),
    },
  });
}
