import { randomUUID } from 'crypto';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { appendRecord, updateRecord, deleteRecord } from '@/lib/sheets/keyedTable';
import { ITEM_CHECK_PHOTO_SLOTS, ITEM_CHECK_PHOTO_TABLE } from '@/lib/sheets/registry';
import { mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';
import { deleteDriveFileFromUrl, uploadImageDataUrl } from '@/lib/drive/upload';
import { ITEM_CHECK_PHOTO_FOLDER_ID } from '@/lib/sheets/sheetIds';
import { requireViewerEmail } from '@/lib/auth-helpers';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

async function afterWrite(): Promise<Record<string, string>[]> {
  const all = await getKeyedList(ITEM_CHECK_PHOTO_TABLE);
  await mirrorKeyedTableToSupabase(
    { tableName: ITEM_CHECK_PHOTO_TABLE.sheetName, primaryKey: ITEM_CHECK_PHOTO_TABLE.primaryKey },
    all
  );
  return all;
}

export async function getItemCheckPhotoList(): Promise<Record<string, string>[]> {
  const list = await getKeyedList(ITEM_CHECK_PHOTO_TABLE);
  return [...list].reverse();
}

// 신규 등록 또는 기존 건 수정(사진 교체 포함) 겸용. payload의 사진 슬롯에 data: URL이 오면 새로 업로드하고
// 기존 파일은 지운다. 슬롯이 비어 있으면 기존 값을 그대로 유지한다.
export async function saveItemCheckPhoto(
  payload: Record<string, string>,
  existingId?: string
): Promise<Record<string, string>[]> {
  if (!payload['카드사용대장ID']) {
    throw new Error('연결할 카드사용대장 내역을 선택해주세요.');
  }
  const viewerEmail = await requireViewerEmail();
  const isNew = !existingId;
  const existing = existingId ? (await getKeyedList(ITEM_CHECK_PHOTO_TABLE)).find((r) => r.id === existingId) : null;
  const id = isNew ? randomUUID() : existingId!;
  const now = nowTimestamp();

  const record: Record<string, string> = {};
  for (const h of ITEM_CHECK_PHOTO_TABLE.headers) {
    if (h === 'id') { record[h] = id; continue; }
    if (h === '등록일시') { record[h] = isNew ? now : existing?.[h] ?? now; continue; }
    if (h === '등록자이메일') { record[h] = isNew ? viewerEmail : existing?.[h] ?? viewerEmail; continue; }
    if (h === '인쇄일시') { record[h] = isNew ? '' : existing?.[h] ?? ''; continue; }
    if (ITEM_CHECK_PHOTO_SLOTS.includes(h)) {
      const incoming = payload[h];
      if (incoming && incoming.startsWith('data:')) {
        if (!isNew && existing?.[h]) await deleteDriveFileFromUrl(existing[h]);
        record[h] = await uploadImageDataUrl(incoming, `${id}_${h}`, ITEM_CHECK_PHOTO_FOLDER_ID);
      } else {
        record[h] = isNew ? '' : existing?.[h] ?? '';
      }
      continue;
    }
    record[h] = payload[h] ?? '';
  }

  if (isNew) await appendRecord(ITEM_CHECK_PHOTO_TABLE, record);
  else await updateRecord(ITEM_CHECK_PHOTO_TABLE, { id }, record);

  return afterWrite();
}

export async function deleteItemCheckPhoto(id: string): Promise<Record<string, string>[]> {
  const existing = (await getKeyedList(ITEM_CHECK_PHOTO_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('삭제할 검수사진 내역을 찾을 수 없습니다.');
  for (const slot of ITEM_CHECK_PHOTO_SLOTS) {
    if (existing[slot]) await deleteDriveFileFromUrl(existing[slot]);
  }
  await deleteRecord(ITEM_CHECK_PHOTO_TABLE, { id });
  return afterWrite();
}

// 회계담당자(또는 관리자)만 켜고 끌 수 있는 "회계확인" 표시 — 인가는 호출부(Server Action)에서 확인한다.
export async function setItemCheckPhotoPrinted(id: string, printed: boolean): Promise<void> {
  const existing = (await getKeyedList(ITEM_CHECK_PHOTO_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('검수사진 내역을 찾을 수 없습니다.');
  const value = printed ? nowTimestamp() : '';
  await updateRecord(ITEM_CHECK_PHOTO_TABLE, { id }, { ...existing, 인쇄일시: value });
  await mirrorKeyedTableToSupabase(
    { tableName: ITEM_CHECK_PHOTO_TABLE.sheetName, primaryKey: ITEM_CHECK_PHOTO_TABLE.primaryKey },
    await getKeyedList(ITEM_CHECK_PHOTO_TABLE)
  );
}
