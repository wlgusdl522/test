import { randomUUID } from 'crypto';
import {
  addKeyedRecord,
  deleteKeyedRecord,
  deleteKeyedRecords,
  getKeyedList,
  updateKeyedRecord,
  upsertKeyedRecord,
  upsertKeyedRecords,
} from '@/lib/mutate/keyedTable';
import {
  STAFF_MEETING_INFO_TABLE,
  STAFF_MEETING_ITEM_TABLE,
  STAFF_MEETING_TEAM_ORDER_TABLE,
  STAFF_MEETING_VALUE_TABLE,
} from '@/lib/sheets/registry';
import { getSystemSettings } from '@/lib/mutate/settings';
import { jandiPost } from '@/lib/notify/jandi';

// 매달 크게 안 바뀌는 값이라 기본값으로 미리 채워두고, 담당자가 그대로 두거나 고쳐서 저장한다
// (회계 전월이월 추천값과 같은 결 — 잠긴 값 아님).
const DEFAULT_MEETING_PLACE = '2층 회의실';
const DEFAULT_MEETING_HOST = '이대원 관장님';
const DEFAULT_MEETING_TEAMS = '복지1 ~ 3팀, 총무팀, 요양센터, 데이케어센터';

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

// "2026-06" -> "2026년 6월"
export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}년 ${Number(m)}월`;
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

// 발표모드 팀 순서 — 저장된 순서가 있는 팀은 그 순서대로, 아직 순서를 정하지 않은 팀은
// 팀목록(심플리스트) 순서 그대로 뒤에 이어붙인다.
export async function getOrderedStaffMeetingTeams(teams: string[]): Promise<string[]> {
  const rows = await getKeyedList(STAFF_MEETING_TEAM_ORDER_TABLE);
  const orderMap = new Map(rows.map((r) => [r.팀명, num(r.순서)]));
  const known = teams.filter((t) => orderMap.has(t)).sort((a, b) => orderMap.get(a)! - orderMap.get(b)!);
  const unknown = teams.filter((t) => !orderMap.has(t));
  return [...known, ...unknown];
}

export async function moveStaffMeetingTeamOrder(teams: string[], 팀명: string, direction: 'up' | 'down'): Promise<void> {
  const ordered = await getOrderedStaffMeetingTeams(teams);
  const idx = ordered.indexOf(팀명);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
  const next = [...ordered];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  await upsertKeyedRecords(
    STAFF_MEETING_TEAM_ORDER_TABLE,
    next.map((t, i) => ({ keyValues: { 팀명: t }, record: { 팀명: t, 순서: String(i + 1) } }))
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

// 회의 자체의 메타정보(일시/장소/진행/참석부서) — 서무가 매달 등록. 장소/진행/참석부서는
// 거의 안 바뀌어서 기본값을 미리 채워둔다. 알림발송일시는 "보내기" 버튼을 눌러 잔디로 보낸
// 마지막 시각을 보여주는 참고용 정보일 뿐, 재발송을 막지는 않는다.
// 업무보고기간/업무계획기간: 표 헤더에 보여줄 문구(예: "2026년 6월"). 비워두면 조회월 기준으로
// 자동 계산하고, 5~6월처럼 여러 달을 묶어 보고할 때는 직접 "2026년 5~6월"로 덮어써서 쓴다
// (이사회자료 업무보고의 기간텍스트와 같은 방식).
export type StaffMeetingInfo = {
  년월: string;
  회의일시: string;
  장소: string;
  진행: string;
  참석부서: string;
  알림발송일시: string;
  업무보고기간: string;
  업무계획기간: string;
};

export async function getStaffMeetingInfo(ym: string): Promise<StaffMeetingInfo> {
  const rows = await getKeyedList(STAFF_MEETING_INFO_TABLE);
  const found = rows.find((r) => r.년월 === ym);
  return {
    년월: ym,
    회의일시: found?.회의일시 ?? '',
    장소: found?.장소 || DEFAULT_MEETING_PLACE,
    진행: found?.진행 || DEFAULT_MEETING_HOST,
    참석부서: found?.참석부서 || DEFAULT_MEETING_TEAMS,
    알림발송일시: found?.알림발송일시 ?? '',
    업무보고기간: found?.업무보고기간 || ymLabel(ym),
    업무계획기간: found?.업무계획기간 || ymLabel(nextYm(ym)),
  };
}

export async function setStaffMeetingInfo(
  ym: string,
  fields: { 회의일시: string; 장소: string; 진행: string; 참석부서: string; 업무보고기간: string; 업무계획기간: string }
): Promise<void> {
  const existing = await getStaffMeetingInfo(ym);
  await upsertKeyedRecord(
    STAFF_MEETING_INFO_TABLE,
    { 년월: ym },
    {
      년월: ym,
      회의일시: fields.회의일시.trim(),
      장소: fields.장소.trim(),
      진행: fields.진행.trim(),
      참석부서: fields.참석부서.trim(),
      알림발송일시: existing.알림발송일시,
      업무보고기간: fields.업무보고기간.trim(),
      업무계획기간: fields.업무계획기간.trim(),
    }
  );
}

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export function formatMeetingDateTime(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAY[d.getDay()]}) ${hh}:${mm}`;
}

// 잔디 알림 화면에 제목/내용을 따로 기본값으로 채워주고, 담당자가 그대로 두거나 고쳐서 보낸다.
export function buildStaffMeetingNotificationTitle(ym: string): string {
  return `${ymLabel(ym)} 전체회의 안내`;
}

// 회의록 작성 마감일은 저장해둔 값이 없어 자동으로 채울 수 없으므로 빈칸으로 남겨 담당자가 직접 적는다.
export function buildStaffMeetingNotificationContent(info: StaffMeetingInfo): string {
  const lines = ['직원 전체 월례회의 일정을 안내합니다.', ''];
  if (info.회의일시) lines.push(` - 일시 : ${formatMeetingDateTime(info.회의일시)}`);
  if (info.장소) lines.push(` - 장소 : ${info.장소}`);
  lines.push('', '전체회의록 작성은  까지 작성부탁드립니다.');
  return lines.join('\n');
}

// "잔디 알림 보내기" 버튼을 누르면 즉시 호출 — 예약/크론 없이 그 자리에서 바로 발송한다.
// message: 화면에서 기본 문구를 고쳐 썼을 수도 있으므로 그대로 전달받아 보낸다.
export async function sendStaffMeetingNotification(ym: string, message: string): Promise<void> {
  const [info, settings] = await Promise.all([getStaffMeetingInfo(ym), getSystemSettings()]);

  await jandiPost(settings.staffMeetingJandiWebhook, message);
  await upsertKeyedRecord(
    STAFF_MEETING_INFO_TABLE,
    { 년월: ym },
    {
      년월: ym,
      회의일시: info.회의일시,
      장소: info.장소,
      진행: info.진행,
      참석부서: info.참석부서,
      알림발송일시: nowTimestamp(),
      업무보고기간: info.업무보고기간,
      업무계획기간: info.업무계획기간,
    }
  );
}
