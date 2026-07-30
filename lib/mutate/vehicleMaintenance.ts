import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { VEHICLE_MAINTENANCE_TABLE } from '@/lib/sheets/registry';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function getVehicleMaintenanceList(): Promise<Record<string, string>[]> {
  const list = await getKeyedList(VEHICLE_MAINTENANCE_TABLE);
  return [...list].reverse();
}

export async function addVehicleMaintenance(payload: Record<string, string>): Promise<Record<string, string>[]> {
  if (!payload['차량번호'] || !payload['정비일자'] || !payload['정비내용']) {
    throw new Error('차량/정비일자/정비내용은 필수입니다.');
  }
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const record: Record<string, string> = {};
  VEHICLE_MAINTENANCE_TABLE.headers.forEach((h) => {
    if (h === 'id') record[h] = randomUUID();
    else if (h === '등록일시') record[h] = nowTimestamp();
    else if (h === '등록자이메일') record[h] = viewerEmail;
    else if (h === '등록자명') record[h] = me?.성명 ?? '';
    else record[h] = payload[h] ?? '';
  });
  return addKeyedRecord(VEHICLE_MAINTENANCE_TABLE, record);
}

export async function updateVehicleMaintenance(
  id: string,
  payload: Record<string, string>
): Promise<Record<string, string>[]> {
  const existing = (await getKeyedList(VEHICLE_MAINTENANCE_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('수정할 정비 기록을 찾을 수 없습니다.');
  const record: Record<string, string> = {};
  VEHICLE_MAINTENANCE_TABLE.headers.forEach((h) => {
    if (h === 'id') record[h] = id;
    else if (h === '등록일시' || h === '등록자이메일' || h === '등록자명') record[h] = existing[h];
    else record[h] = payload[h] ?? '';
  });
  return updateKeyedRecord(VEHICLE_MAINTENANCE_TABLE, { id }, record);
}

export async function deleteVehicleMaintenance(id: string): Promise<Record<string, string>[]> {
  return deleteKeyedRecord(VEHICLE_MAINTENANCE_TABLE, { id });
}
