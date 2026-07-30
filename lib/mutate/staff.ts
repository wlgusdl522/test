import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { STAFF_TABLE } from '@/lib/sheets/registry';
import { STAFF_STAMP_FOLDER_ID } from '@/lib/sheets/sheetIds';
import { deleteDriveFileFromUrl, uploadImageDataUrl } from '@/lib/drive/upload';

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

// 로그인한 본인의 도장 이미지를 등록/교체한다(본인 이메일 행만 찾아서 바꾸므로 다른 사람 도장은 못 바꿈).
export async function saveMyStamp(email: string, dataUrl: string): Promise<string> {
  const existing = (await getStaffList()).find((s) => s['이메일(아이디)'] === email);
  if (!existing) throw new Error('직원관리에 등록된 내 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.');
  if (existing['도장']) await deleteDriveFileFromUrl(existing['도장']);
  const url = await uploadImageDataUrl(dataUrl, `${email.replace(/[^a-zA-Z0-9]/g, '_')}_stamp`, STAFF_STAMP_FOLDER_ID);
  await updateKeyedRecord(STAFF_TABLE, { '이메일(아이디)': email }, { ...existing, 도장: url });
  return url;
}

// 로그인한 본인의 잔디(JANDI) 개인 웹훅 URL을 등록/수정한다 — 결재요청/승인/반려 알림이 본인에게만
// 오도록 하려면 각자 이걸 등록해야 한다("나와의 채팅" 토픽에 연결한 인커밍 웹훅).
export async function saveMyJandiWebhook(email: string, webhookUrl: string): Promise<void> {
  const existing = (await getStaffList()).find((s) => s['이메일(아이디)'] === email);
  if (!existing) throw new Error('직원관리에 등록된 내 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.');
  await updateKeyedRecord(STAFF_TABLE, { '이메일(아이디)': email }, { ...existing, 잔디웹훅: webhookUrl.trim() });
}
