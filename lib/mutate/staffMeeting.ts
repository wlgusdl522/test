import { randomUUID } from 'crypto';
import {
  addKeyedRecord,
  deleteKeyedRecord,
  deleteKeyedRecords,
  getKeyedList,
  updateKeyedRecord,
  upsertKeyedRecords,
} from '@/lib/mutate/keyedTable';
import { STAFF_MEETING_ITEM_TABLE, STAFF_MEETING_VALUE_TABLE } from '@/lib/sheets/registry';

// 전체회의자료 — 팀별로 사업구분(고정 목록)마다 이번달 업무보고/다음달 업무계획/타 부서 협조사항을
// 매달 입력한다. 원래 구글슬라이드로 팀별 한 장씩 만들던 것을 그대로 포털로 옮긴 것.
export type StaffMeetingItem = { id: string; 팀명: string; 사업구분: string; 정렬순서: number };
export type StaffMeetingValue = {
  사업구분ID: string;
  팀명: string;
  년월: string;
  업무보고: string;
  업무계획: string;
  협조사항: string;
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// "2026-09" -> "2026-08" (연도 경계도 Date가 알아서 처리)
export function prevYm(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// "2026-09" -> "2026-10"
export function nextYm(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getStaffMeetingItems(팀명: string): Promise<StaffMeetingItem[]> {
  const rows = await getKeyedList(STAFF_MEETING_ITEM_TABLE);
  return rows
    .filter((r) => r.id && r.팀명 === 팀명)
    .map((r) => ({ id: r.id, 팀명: r.팀명, 사업구분: r.사업구분, 정렬순서: num(r.정렬순서) }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function addStaffMeetingItem(팀명: string, 사업구분: string): Promise<void> {
  const trimmed = 사업구분.trim();
  if (!trimmed) throw new Error('사업구분을 입력해주세요.');
  const items = await getStaffMeetingItems(팀명);
  const nextOrder = Math.max(0, ...items.map((i) => i.정렬순서)) + 1;
  await addKeyedRecord(STAFF_MEETING_ITEM_TABLE, {
    id: randomUUID(),
    팀명,
    사업구분: trimmed,
    정렬순서: String(nextOrder),
  });
}

export async function deleteStaffMeetingItem(id: string): Promise<void> {
  await deleteKeyedRecord(STAFF_MEETING_ITEM_TABLE, { id });
}

export async function moveStaffMeetingItem(팀명: string, id: string, direction: 'up' | 'down'): Promise<void> {
  const items = await getStaffMeetingItems(팀명);
  const idx = items.findIndex((i) => i.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
  const a = items[idx];
  const b = items[swapIdx];
  await updateKeyedRecord(
    STAFF_MEETING_ITEM_TABLE, { id: a.id },
    { id: a.id, 팀명: a.팀명, 사업구분: a.사업구분, 정렬순서: String(b.정렬순서) }
  );
  await updateKeyedRecord(
    STAFF_MEETING_ITEM_TABLE, { id: b.id },
    { id: b.id, 팀명: b.팀명, 사업구분: b.사업구분, 정렬순서: String(a.정렬순서) }
  );
}

export async function getStaffMeetingValues(사업구분IDs: string[]): Promise<StaffMeetingValue[]> {
  const rows = await getKeyedList(STAFF_MEETING_VALUE_TABLE);
  const idSet = new Set(사업구분IDs);
  return rows
    .filter((r) => idSet.has(r.사업구분ID))
    .map((r) => ({
      사업구분ID: r.사업구분ID,
      팀명: r.팀명,
      년월: r.년월,
      업무보고: r.업무보고,
      업무계획: r.업무계획,
      협조사항: r.협조사항,
    }));
}

export function valueFor(values: StaffMeetingValue[], 사업구분ID: string, ym: string): StaffMeetingValue | undefined {
  return values.find((v) => v.사업구분ID === 사업구분ID && v.년월 === ym);
}

// 지난달 조회 시 입력해둔 "다음달 업무계획"을 이번달 화면에 참고용으로 보여준다(자동 복사는 아님).
export function prevPlanFor(values: StaffMeetingValue[], 사업구분ID: string, ym: string): string {
  return valueFor(values, 사업구분ID, prevYm(ym))?.업무계획 ?? '';
}

// 세 칸 다 비어있으면 굳이 빈 행을 시트에 남기지 않고 지운다(boardStat.setModuleValues와 동일한 방식).
// 항목 수만큼 upsert/delete를 순차 호출하면 API 호출이 늘어나 속도제한에 걸릴 수 있어 batch 한 번씩으로 묶는다.
export async function setStaffMeetingValues(
  팀명: string,
  ym: string,
  entries: { 사업구분ID: string; 업무보고: string; 업무계획: string; 협조사항: string }[],
  writerEmail: string,
  writerName: string
): Promise<void> {
  const rows = await getKeyedList(STAFF_MEETING_VALUE_TABLE);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const toDelete: { 사업구분ID: string; 팀명: string; 년월: string }[] = [];
  const toUpsert: { keyValues: Record<string, string>; record: Record<string, string> }[] = [];

  for (const e of entries) {
    const 업무보고 = e.업무보고.trim();
    const 업무계획 = e.업무계획.trim();
    const 협조사항 = e.협조사항.trim();
    const existing = rows.find((r) => r.사업구분ID === e.사업구분ID && r.팀명 === 팀명 && r.년월 === ym);
    if (!업무보고 && !업무계획 && !협조사항) {
      if (existing) toDelete.push({ 사업구분ID: e.사업구분ID, 팀명, 년월: ym });
      continue;
    }
    toUpsert.push({
      keyValues: { 사업구분ID: e.사업구분ID, 팀명, 년월: ym },
      record: {
        사업구분ID: e.사업구분ID,
        팀명,
        년월: ym,
        업무보고,
        업무계획,
        협조사항,
        작성자이메일: writerEmail,
        작성자명: writerName,
        등록일시: now,
      },
    });
  }

  if (toDelete.length > 0) await deleteKeyedRecords(STAFF_MEETING_VALUE_TABLE, toDelete);
  if (toUpsert.length > 0) await upsertKeyedRecords(STAFF_MEETING_VALUE_TABLE, toUpsert);
}
