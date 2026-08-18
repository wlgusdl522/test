import { randomUUID } from 'crypto';
import { deleteKeyedRecords, getKeyedList, upsertKeyedRecords } from '@/lib/mutate/keyedTable';
import { BOARD_ADMIN_NOTE_TABLE } from '@/lib/sheets/registry';

// 요약 업무보고 "8. 행정사항" — 월별로 자유롭게 줄글을 몇 줄 적어 넣는 목록.
export type AdminNote = { id: string; 년월: string; 내용: string; 정렬순서: number };

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getAdminNotes(ym: string): Promise<AdminNote[]> {
  const rows = await getKeyedList(BOARD_ADMIN_NOTE_TABLE);
  return rows
    .filter((r) => r.id && r.년월 === ym)
    .map((r) => ({ id: r.id, 년월: r.년월, 내용: r.내용, 정렬순서: num(r.정렬순서) }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function saveAdminNotes(ym: string, contents: { id?: string; 내용: string }[]): Promise<void> {
  const existing = await getAdminNotes(ym);
  const keepIds = new Set(contents.filter((c) => c.id).map((c) => c.id));
  const toDelete = existing.filter((e) => !keepIds.has(e.id)).map((e) => ({ id: e.id }));
  if (toDelete.length > 0) await deleteKeyedRecords(BOARD_ADMIN_NOTE_TABLE, toDelete);

  const items = contents.map((c, i) => {
    const id = c.id || randomUUID();
    return { keyValues: { id }, record: { id, 년월: ym, 내용: c.내용, 정렬순서: String(i + 1) } };
  });
  if (items.length > 0) await upsertKeyedRecords(BOARD_ADMIN_NOTE_TABLE, items);
}
