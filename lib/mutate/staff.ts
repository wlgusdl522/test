import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { STAFF_TABLE } from '@/lib/sheets/registry';

function fillRecord(payload: Record<string, string>): Record<string, string> {
  const record: Record<string, string> = {};
  STAFF_TABLE.headers.forEach((h) => {
    record[h] = payload[h] ?? '';
  });
  return record;
}

export async function getStaffList(): Promise<Record<string, string>[]> {
  return getKeyedList(STAFF_TABLE);
}

export async function getActiveStaffDirectory(): Promise<Record<string, string>[]> {
  const all = await getStaffList();
  return all.filter((s) => s['재직상태'] === '재직');
}

export async function addStaff(payload: Record<string, string>): Promise<Record<string, string>[]> {
  if (!payload['이메일(아이디)'] || !payload['성명']) {
    throw new Error('이메일(아이디)과 성명은 필수입니다.');
  }
  const existing = await getStaffList();
  if (existing.some((s) => s['이메일(아이디)'] === payload['이메일(아이디)'])) {
    throw new Error(`이미 등록된 이메일(아이디)입니다: ${payload['이메일(아이디)']}`);
  }
  return addKeyedRecord(STAFF_TABLE, fillRecord(payload));
}

export async function updateStaff(
  originalEmail: string,
  payload: Record<string, string>
): Promise<Record<string, string>[]> {
  if (!payload['이메일(아이디)'] || !payload['성명']) {
    throw new Error('이메일(아이디)과 성명은 필수입니다.');
  }
  if (payload['이메일(아이디)'] !== originalEmail) {
    const existing = await getStaffList();
    if (existing.some((s) => s['이메일(아이디)'] === payload['이메일(아이디)'])) {
      throw new Error(`이미 등록된 이메일(아이디)입니다: ${payload['이메일(아이디)']}`);
    }
  }
  return updateKeyedRecord(STAFF_TABLE, { '이메일(아이디)': originalEmail }, fillRecord(payload));
}

export async function deleteStaff(email: string): Promise<Record<string, string>[]> {
  return deleteKeyedRecord(STAFF_TABLE, { '이메일(아이디)': email });
}
