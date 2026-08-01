import { randomUUID } from 'crypto';
import { getSheetsClient } from '@/lib/sheets/client';
import { getAllRecords } from '@/lib/sheets/keyedTable';
import { addKeyedRecord, deleteKeyedRecord, deleteKeyedRecords, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { VEHICLE_REQUEST_TABLE } from '@/lib/sheets/registry';
import { mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';
import { findOverlappingRequest, timesOverlap } from '@/lib/vehicleTimeOverlap';

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

// 겹침 확인은 Supabase 캐시가 아니라 항상 시트(원본)에서 직접 읽는다 — 미러링이
// 밀리거나 실패해도(방금 대량으로 등록한 반복 신청 직후 등) 캐시가 새 데이터를 아직
// 못 따라가서 중복 검사가 뚫리는 일이 없도록.
async function assertNoOverlap(payload: Record<string, string>, excludeId?: string) {
  const all = await getAllRecords(VEHICLE_REQUEST_TABLE);
  const conflict = findOverlappingRequest(
    all,
    {
      차량번호: payload['차량번호'],
      사용일자: payload['사용일자'],
      출발시간: payload['출발시간'],
      복귀시간: payload['복귀시간'],
    },
    excludeId
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
): Promise<{ count: number; firstDate: string; requests: Record<string, string>[] }> {
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
  const existing = await getAllRecords(VEHICLE_REQUEST_TABLE);

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
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });

  // 방금 시트에 직접 append했으므로, Supabase를 먼저 보는 getKeyedList가 아니라
  // 항상 시트에서 곧바로 다시 읽어야 한다 — 안 그러면 미러링 대상 목록 자체가
  // (아직 새 행을 못 받은) Supabase의 예전 스냅샷이 되어 새로 만든 행이 Supabase에
  // 영영 반영되지 않는다(스프레드시트엔 있는데 Supabase·웹앱엔 안 보이는 원인이었음).
  const all = await getAllRecords(VEHICLE_REQUEST_TABLE);
  await mirrorKeyedTableToSupabase({ tableName: VEHICLE_REQUEST_TABLE.sheetName, primaryKey: VEHICLE_REQUEST_TABLE.primaryKey }, all);

  const dateColumnIndex = VEHICLE_REQUEST_TABLE.headers.indexOf('사용일자');
  return { count: rows.length, firstDate: rows[0][dateColumnIndex], requests: all };
}

// 반복 일정 중 하나를 지울 때 "이번 건만"(deleteVehicleRequest)이 아니라 "이 날짜 이후 전체"를 지운다.
// 지나간 과거 회차는 남긴다.
export async function deleteVehicleRequestSeriesFrom(
  id: string
): Promise<{ count: number; requests: Record<string, string>[] }> {
  const all = await getAllRecords(VEHICLE_REQUEST_TABLE);
  const target = all.find((r) => r.id === id);
  if (!target) throw new Error('삭제할 신청을 찾을 수 없습니다.');
  const groupId = target['반복그룹ID'];
  if (!groupId) throw new Error('반복 일정이 아닌 신청입니다.');
  const targetDate = target['사용일자'];

  const toDelete = all.filter((r) => r['반복그룹ID'] === groupId && r['사용일자'] >= targetDate);
  if (toDelete.length === 0) return { count: 0, requests: all };
  // 건마다 따로 지우면 반복 횟수만큼 API 왕복이 반복돼 대량 삭제 시 요청 한도에 걸려
  // 일부만 지워지고 중단될 수 있었다 — 시트 삭제도, Supabase 미러링도 한 번씩만 한다.
  const requests = await deleteKeyedRecords(
    VEHICLE_REQUEST_TABLE,
    toDelete.map((r) => ({ id: r.id }))
  );
  return { count: toDelete.length, requests };
}
