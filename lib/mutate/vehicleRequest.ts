import { randomUUID } from 'crypto';
import { getSheetsClient } from '@/lib/sheets/client';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { VEHICLE_REQUEST_TABLE } from '@/lib/sheets/registry';
import { mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function getVehicleRequestList(): Promise<Record<string, string>[]> {
  const list = await getKeyedList(VEHICLE_REQUEST_TABLE);
  return [...list].reverse();
}

function requireFields(payload: Record<string, string>) {
  if (!payload['차량번호'] || !payload['사용일자'] || !payload['목적']) {
    throw new Error('차량/사용일자/목적은 필수입니다.');
  }
}

// 시간이 비어있으면 하루 전체를 막는 것으로 보고 겹침을 판정한다(부분적으로만 아는 경우 안전한 쪽으로).
function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const aS = aStart || '00:00';
  const aE = aEnd || '23:59';
  const bS = bStart || '00:00';
  const bE = bEnd || '23:59';
  return aS < bE && bS < aE;
}

async function assertNoOverlap(payload: Record<string, string>, excludeId?: string) {
  const all = await getKeyedList(VEHICLE_REQUEST_TABLE);
  const conflict = all.find(
    (r) =>
      r.id !== excludeId &&
      r['차량번호'] === payload['차량번호'] &&
      r['사용일자'] === payload['사용일자'] &&
      timesOverlap(r['출발시간'], r['복귀시간'], payload['출발시간'], payload['복귀시간'])
  );
  if (conflict) {
    throw new Error(
      `이미 ${conflict['신청자명']}님이 같은 시간대(${conflict['출발시간'] || '00:00'}~${conflict['복귀시간'] || '23:59'})에 이 차량을 예약해서 신청이 중복됩니다.`
    );
  }
}

export async function addVehicleRequest(payload: Record<string, string>): Promise<Record<string, string>[]> {
  requireFields(payload);
  await assertNoOverlap(payload);
  const record: Record<string, string> = {};
  VEHICLE_REQUEST_TABLE.headers.forEach((h) => {
    if (h === 'id') record[h] = randomUUID();
    else if (h === '등록일시') record[h] = nowTimestamp();
    else record[h] = payload[h] ?? '';
  });
  return addKeyedRecord(VEHICLE_REQUEST_TABLE, record);
}

export async function updateVehicleRequest(
  id: string,
  payload: Record<string, string>
): Promise<Record<string, string>[]> {
  requireFields(payload);
  await assertNoOverlap(payload, id);
  const existing = (await getKeyedList(VEHICLE_REQUEST_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('수정할 신청을 찾을 수 없습니다.');
  const record: Record<string, string> = {};
  VEHICLE_REQUEST_TABLE.headers.forEach((h) => {
    if (h === 'id') record[h] = id;
    else if (h === '등록일시') record[h] = existing['등록일시'];
    else record[h] = payload[h] ?? '';
  });
  return updateKeyedRecord(VEHICLE_REQUEST_TABLE, { id }, record);
}

export async function deleteVehicleRequest(id: string): Promise<Record<string, string>[]> {
  return deleteKeyedRecord(VEHICLE_REQUEST_TABLE, { id });
}

// 매주 월/목 도시락배달처럼, 사용일자~종료일 사이 선택 요일마다 같은 내용으로 신청을 한 번에 만든다.
// weekdays: 0(일)~6(토).
export async function addVehicleRequestsRecurring(
  payload: Record<string, string>,
  weekdays: number[],
  untilDate: string
): Promise<{ count: number }> {
  requireFields(payload);
  if (!weekdays.length) throw new Error('반복할 요일을 선택해주세요.');
  if (!untilDate) throw new Error('반복 종료일을 입력해주세요.');

  const start = new Date(`${payload['사용일자']}T00:00:00`);
  const end = new Date(`${untilDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('날짜 형식이 올바르지 않습니다.');
  }
  if (end < start) throw new Error('반복 종료일은 사용일자보다 늦어야 합니다.');

  const dowSet = new Set(weekdays.map(Number));
  const now = nowTimestamp();
  const groupId = randomUUID();
  const MAX_OCCURRENCES = 260;
  const rows: string[][] = [];
  const existing = await getKeyedList(VEHICLE_REQUEST_TABLE);

  const cur = new Date(start);
  while (cur <= end) {
    if (dowSet.has(cur.getDay())) {
      if (rows.length >= MAX_OCCURRENCES) {
        throw new Error(`반복 기간이 너무 길어서(${MAX_OCCURRENCES}건 초과) 한 번에 등록할 수 없습니다. 종료일을 줄여서 나눠 등록해주세요.`);
      }
      const iso = cur.toISOString().slice(0, 10);
      const conflict = existing.find(
        (r) =>
          r['차량번호'] === payload['차량번호'] &&
          r['사용일자'] === iso &&
          timesOverlap(r['출발시간'], r['복귀시간'], payload['출발시간'], payload['복귀시간'])
      );
      if (conflict) {
        throw new Error(
          `${iso}에 이미 ${conflict['신청자명']}님의 예약이 있어 반복 등록이 중단됐습니다. 아직 등록되지 않았으니 겹치는 날짜를 확인해주세요.`
        );
      }
      rows.push(
        VEHICLE_REQUEST_TABLE.headers.map((h) => {
          if (h === 'id') return randomUUID();
          if (h === '등록일시') return now;
          if (h === '사용일자') return iso;
          if (h === '반복그룹ID') return groupId;
          return payload[h] ?? '';
        })
      );
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (!rows.length) throw new Error('선택한 요일에 해당하는 날짜가 없습니다.');

  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId: VEHICLE_REQUEST_TABLE.spreadsheetId,
    range: `${VEHICLE_REQUEST_TABLE.sheetName}!A3`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  const all = await getKeyedList(VEHICLE_REQUEST_TABLE);
  await mirrorKeyedTableToSupabase({ tableName: VEHICLE_REQUEST_TABLE.sheetName, primaryKey: VEHICLE_REQUEST_TABLE.primaryKey }, all);

  return { count: rows.length };
}

// 반복 일정 중 하나를 지울 때 "이번 건만"(deleteVehicleRequest)이 아니라 "이 날짜 이후 전체"를 지운다.
// 지나간 과거 회차는 남긴다.
export async function deleteVehicleRequestSeriesFrom(id: string): Promise<{ count: number }> {
  const all = await getKeyedList(VEHICLE_REQUEST_TABLE);
  const target = all.find((r) => r.id === id);
  if (!target) throw new Error('삭제할 신청을 찾을 수 없습니다.');
  const groupId = target['반복그룹ID'];
  if (!groupId) throw new Error('반복 일정이 아닌 신청입니다.');
  const targetDate = target['사용일자'];

  const toDelete = all.filter((r) => r['반복그룹ID'] === groupId && r['사용일자'] >= targetDate);
  for (const r of toDelete) {
    await deleteKeyedRecord(VEHICLE_REQUEST_TABLE, { id: r.id });
  }
  return { count: toDelete.length };
}
