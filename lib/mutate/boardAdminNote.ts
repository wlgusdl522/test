import { randomUUID } from 'crypto';
import { deleteKeyedRecords, getKeyedList, upsertKeyedRecords } from '@/lib/mutate/keyedTable';
import { BOARD_ADMIN_NOTE_TABLE } from '@/lib/sheets/registry';

// 요약 업무보고 "8. 행정사항" — 월별로 자유롭게 줄글(1. / 1) / 가) 같은 하위번호 포함, 여러 줄)을
// 적어 넣는 목록. 요약보고에는 원문 그대로가 아니라 줄인 문구를 싣고 싶을 수 있어, 요약에 포함할
// 항목을 체크하고 그 항목만 독립적으로 줄여 쓸 수 있는 요약내용을 따로 둔다.
export type AdminNote = {
  id: string;
  년월: string;
  내용: string;
  정렬순서: number;
  요약포함: boolean;
  요약내용: string;
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getAdminNotes(ym: string): Promise<AdminNote[]> {
  const rows = await getKeyedList(BOARD_ADMIN_NOTE_TABLE);
  return rows
    .filter((r) => r.id && r.년월 === ym)
    .map((r) => ({
      id: r.id, 년월: r.년월, 내용: r.내용, 정렬순서: num(r.정렬순서),
      요약포함: r.요약포함 === 'TRUE', 요약내용: r.요약내용 || '',
    }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

// 요약보고 8) 행정사항에 실제로 표시할 목록 — 요약포함 체크된 것만, 요약내용이 비어있으면 원문으로 대체.
export async function getAdminNoteSummaries(ym: string): Promise<{ id: string; 내용: string }[]> {
  const notes = await getAdminNotes(ym);
  return notes.filter((n) => n.요약포함).map((n) => ({ id: n.id, 내용: n.요약내용.trim() || n.내용 }));
}

export async function saveAdminNotes(
  ym: string,
  contents: { id?: string; 내용: string; 요약포함: boolean; 요약내용: string }[]
): Promise<void> {
  const existing = await getAdminNotes(ym);
  const keepIds = new Set(contents.filter((c) => c.id).map((c) => c.id));
  const toDelete = existing.filter((e) => !keepIds.has(e.id)).map((e) => ({ id: e.id }));
  if (toDelete.length > 0) await deleteKeyedRecords(BOARD_ADMIN_NOTE_TABLE, toDelete);

  const items = contents.map((c, i) => {
    const id = c.id || randomUUID();
    return {
      keyValues: { id },
      record: {
        id, 년월: ym, 내용: c.내용, 정렬순서: String(i + 1),
        요약포함: c.요약포함 ? 'TRUE' : 'FALSE', 요약내용: c.요약내용,
      },
    };
  });
  if (items.length > 0) await upsertKeyedRecords(BOARD_ADMIN_NOTE_TABLE, items);
}
