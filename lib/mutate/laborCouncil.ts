import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import {
  LABOR_COUNCIL_AGENDA_TABLE,
  LABOR_COUNCIL_MEMBER_TABLE,
  LABOR_COUNCIL_MINUTES_TABLE,
  LABOR_COUNCIL_ROUND_INFO_TABLE,
} from '@/lib/sheets/registry';
import { isAdminEmail, requireCanManagePermissions, requireViewerEmail } from '@/lib/auth-helpers';
import { getSystemSettings } from '@/lib/mutate/settings';
import { jandiPostRich } from '@/lib/notify/jandi';

// 노사협의회 — 안건은 상시로 접수받고(전 직원 제출, 전 직원 조회 가능), 위원이 검토해서 특정
// 회의에 상정하고, 회의록(위원만 작성)에서 안건별 근로자/사용자 의견+결정사항을 기록하는 흐름.
// 참고자료(45차 안건취합.hwp, 44차 회의록.hwp) 서식 기준으로 시작했으나, 이후 상시접수+상태
// 추적 구조로 재구성함.

export type LaborCouncilMemberType = '근로자위원' | '사용자위원';

export type LaborCouncilMember = { 이메일: string; 성명: string; 구분: LaborCouncilMemberType; 정렬순서: number };

export type AgendaStatus = '접수' | '검토중' | '상정예정' | '협의완료' | '결과공유';
export const AGENDA_STATUSES: AgendaStatus[] = ['접수', '검토중', '상정예정', '협의완료', '결과공유'];

export type AgendaVisibility = '실명' | '익명';

export type LaborCouncilAgendaItem = {
  id: string;
  이메일: string;
  성명: string;
  항목명: string;
  제안내용: string;
  등록일시: string;
  공개여부: AgendaVisibility;
  상태: AgendaStatus;
  상정회차: string;
};

// 전체 조회 화면(전 직원 대상)에서는 공개여부와 무관하게 항상 익명으로 보여주고, 노사위원만
// 실제 제안자를 볼 수 있게 한다 — 안건현황이 전 직원 공개 화면이라 익명 보호를 기본으로 둠.
export function displayedProposerName(item: LaborCouncilAgendaItem, viewerIsCouncil: boolean): string {
  if (!viewerIsCouncil) return '익명';
  return item.공개여부 === '실명' ? item.성명 : '익명';
}

export type ResolutionRow = {
  안건제목: string;
  근로자의견: string;
  사용자의견: string;
  의결내용: string;
  담당자: string;
  추진기한: string;
};
export type AttendeeRow = { 이메일: string; 성명: string; 구분: string; 참석: boolean };

export type LaborCouncilMinutes = {
  회차: string;
  회의일시: string;
  회의장소: string;
  협의의결: ResolutionRow[];
  보고사항: string;
  의결된사항: string;
  참석자: AttendeeRow[];
  등록일시: string;
  최종수정이메일: string;
};

export type MeetingStatus = '예정' | '완료';

export type LaborCouncilMeeting = {
  회차: string;
  회의일시: string;
  회의장소: string;
  상태: MeetingStatus;
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function getLaborCouncilMembers(): Promise<LaborCouncilMember[]> {
  const rows = await getKeyedList(LABOR_COUNCIL_MEMBER_TABLE);
  return rows
    .map((r) => ({
      이메일: r.이메일,
      성명: r.성명,
      구분: (r.구분 === '사용자위원' ? '사용자위원' : '근로자위원') as LaborCouncilMemberType,
      정렬순서: num(r.정렬순서),
    }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function addLaborCouncilMember(
  이메일: string,
  성명: string,
  구분: LaborCouncilMemberType
): Promise<void> {
  await requireCanManagePermissions();
  const trimmed = 이메일.trim().toLowerCase();
  if (!trimmed) throw new Error('이메일을 입력해주세요.');
  const members = await getLaborCouncilMembers();
  const nextOrder = Math.max(0, ...members.map((m) => m.정렬순서)) + 1;
  await addKeyedRecord(LABOR_COUNCIL_MEMBER_TABLE, {
    이메일: trimmed,
    성명: 성명.trim(),
    구분,
    정렬순서: String(nextOrder),
  });
}

export async function removeLaborCouncilMember(이메일: string): Promise<void> {
  await requireCanManagePermissions();
  await deleteKeyedRecord(LABOR_COUNCIL_MEMBER_TABLE, { 이메일: 이메일.trim().toLowerCase() });
}

export async function isLaborCouncilMember(email: string): Promise<boolean> {
  const members = await getLaborCouncilMembers();
  return members.some((m) => m.이메일.toLowerCase() === email.toLowerCase());
}

// 관리자는 항상 가능. 그 외에는 노사협의회위원 명단에 등록된 사람(근로자위원·사용자위원 구분 없이)만
// 안건 상태변경·회의 등록·회의록 작성을 할 수 있다 — "정해진 위원들만" 편집, 나머지 직원은 조회만.
export async function canEditLaborCouncilMinutes(): Promise<boolean> {
  const email = await requireViewerEmail();
  if (await isAdminEmail(email)) return true;
  return isLaborCouncilMember(email);
}

export async function requireCanEditLaborCouncilMinutes(): Promise<void> {
  if (!(await canEditLaborCouncilMinutes())) {
    throw new Error('이 작업은 노사협의회 위원만 할 수 있습니다.');
  }
}

function parseRoundNumber(회차: string): number {
  const n = Number(회차.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// ── 안건(상시 접수) ──────────────────────────────────────────────
function toAgendaItem(r: Record<string, string>): LaborCouncilAgendaItem {
  return {
    id: r.id,
    이메일: r.이메일,
    성명: r.성명,
    항목명: r.항목명,
    제안내용: r.제안내용,
    등록일시: r.등록일시,
    공개여부: (r.공개여부 === '익명' ? '익명' : '실명') as AgendaVisibility,
    상태: (AGENDA_STATUSES.includes(r.상태 as AgendaStatus) ? r.상태 : '접수') as AgendaStatus,
    상정회차: r.상정회차 ?? '',
  };
}

export async function getAllAgendaItems(): Promise<LaborCouncilAgendaItem[]> {
  const rows = await getKeyedList(LABOR_COUNCIL_AGENDA_TABLE);
  return rows.map(toAgendaItem).sort((a, b) => b.등록일시.localeCompare(a.등록일시));
}

export async function getMyAgendaItems(email: string): Promise<LaborCouncilAgendaItem[]> {
  const all = await getAllAgendaItems();
  return all.filter((a) => a.이메일.toLowerCase() === email.toLowerCase());
}

export async function getAgendaItemsForRound(회차: string): Promise<LaborCouncilAgendaItem[]> {
  const all = await getAllAgendaItems();
  return all.filter((a) => a.상정회차 === 회차).sort((a, b) => a.등록일시.localeCompare(b.등록일시));
}

export async function addAgendaItem(
  항목명: string,
  제안내용: string,
  공개여부: AgendaVisibility,
  email: string,
  name: string
): Promise<void> {
  const trimmedItem = 항목명.trim();
  const trimmedContent = 제안내용.trim();
  if (!trimmedItem) throw new Error('제목을 입력해주세요.');
  if (!trimmedContent) throw new Error('내용을 입력해주세요.');
  await addKeyedRecord(LABOR_COUNCIL_AGENDA_TABLE, {
    id: randomUUID(),
    회차: '',
    이메일: email,
    성명: name,
    항목명: trimmedItem,
    제안내용: trimmedContent,
    등록일시: nowTimestamp(),
    공개여부,
    상태: '접수',
    상정회차: '',
  });
}

// 삭제(취합 정리)는 위원만 — 본인이 낸 안건이라도 전체 직원이 서로 지울 수 있으면 곤란하므로.
export async function deleteAgendaItem(id: string): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  await deleteKeyedRecord(LABOR_COUNCIL_AGENDA_TABLE, { id });
}

// 상태변경·상정 회차 지정은 위원만 — 안건현황 화면에서 바로 쓰는 관리 액션.
export async function updateAgendaStatus(id: string, 상태: AgendaStatus, 상정회차: string): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  const rows = await getKeyedList(LABOR_COUNCIL_AGENDA_TABLE);
  const found = rows.find((r) => r.id === id);
  if (!found) throw new Error('안건을 찾을 수 없습니다.');
  await upsertKeyedRecord(
    LABOR_COUNCIL_AGENDA_TABLE,
    { id },
    { ...found, 상태, 상정회차: 상정회차.trim() }
  );
}

function parseJsonArray<T>(raw: string | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 저장된 회의록이 없으면, 이번 회차에 상정된 안건을 협의의결 초안(근로자의견 자리에 제안내용을
// 임시로 채움)으로, 현재 위원 명단을 참석자 초안(전원 참석 처리)으로 미리 채운다 — 위원이 매번
// 빈 표부터 다 채우지 않아도 되게.
export async function getMinutes(회차: string): Promise<LaborCouncilMinutes> {
  const rows = await getKeyedList(LABOR_COUNCIL_MINUTES_TABLE);
  const found = rows.find((r) => r.회차 === 회차);
  if (found) {
    return {
      회차,
      회의일시: found.회의일시 ?? '',
      회의장소: found.회의장소 ?? '',
      협의의결: parseJsonArray<ResolutionRow>(found.협의의결JSON),
      보고사항: found.보고사항 ?? '',
      의결된사항: found.의결된사항 ?? '',
      참석자: parseJsonArray<AttendeeRow>(found.참석자JSON),
      등록일시: found.등록일시 ?? '',
      최종수정이메일: found.최종수정이메일 ?? '',
    };
  }

  const [agendaItems, members] = await Promise.all([getAgendaItemsForRound(회차), getLaborCouncilMembers()]);
  return {
    회차,
    회의일시: '',
    회의장소: '',
    협의의결: agendaItems.map((a) => ({
      안건제목: a.항목명, 근로자의견: a.제안내용, 사용자의견: '', 의결내용: '', 담당자: '', 추진기한: '',
    })),
    보고사항: '',
    의결된사항: '',
    참석자: members.map((m) => ({ 이메일: m.이메일, 성명: m.성명, 구분: m.구분, 참석: true })),
    등록일시: '',
    최종수정이메일: '',
  };
}

export async function saveMinutes(
  회차: string,
  fields: {
    회의일시: string;
    회의장소: string;
    협의의결: ResolutionRow[];
    보고사항: string;
    의결된사항: string;
    참석자: AttendeeRow[];
  }
): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  const email = await requireViewerEmail();
  const existing = await getKeyedList(LABOR_COUNCIL_MINUTES_TABLE);
  const found = existing.find((r) => r.회차 === 회차);
  await upsertKeyedRecord(
    LABOR_COUNCIL_MINUTES_TABLE,
    { 회차 },
    {
      회차,
      회의일시: fields.회의일시.trim(),
      회의장소: fields.회의장소.trim(),
      협의의결JSON: JSON.stringify(fields.협의의결),
      보고사항: fields.보고사항.trim(),
      의결된사항: fields.의결된사항.trim(),
      참석자JSON: JSON.stringify(fields.참석자),
      등록일시: found?.등록일시 || nowTimestamp(),
      최종수정이메일: email,
    }
  );
}

// ── 회의(예정/지난) ──────────────────────────────────────────────
export async function getMeetings(): Promise<LaborCouncilMeeting[]> {
  const rows = await getKeyedList(LABOR_COUNCIL_ROUND_INFO_TABLE);
  return rows
    .filter((r) => r.회의일시 || r.회의장소)
    .map((r) => ({
      회차: r.회차,
      회의일시: r.회의일시 ?? '',
      회의장소: r.회의장소 ?? '',
      상태: (r.상태 === '완료' ? '완료' : '예정') as MeetingStatus,
    }))
    .sort((a, b) => parseRoundNumber(b.회차) - parseRoundNumber(a.회차));
}

export async function getNextRound(): Promise<string> {
  const [meetings, minutesRows, agendaRows] = await Promise.all([
    getMeetings(),
    getKeyedList(LABOR_COUNCIL_MINUTES_TABLE),
    getKeyedList(LABOR_COUNCIL_AGENDA_TABLE),
  ]);
  const rounds = new Set<string>();
  meetings.forEach((m) => m.회차 && rounds.add(m.회차));
  minutesRows.forEach((r) => r.회차 && rounds.add(r.회차));
  agendaRows.forEach((r) => r.상정회차 && rounds.add(r.상정회차));
  const max = Math.max(0, ...[...rounds].map(parseRoundNumber));
  return String(max + 1);
}

// 회차는 위원이 직접 입력할 수 있다(추천값은 자동 채움) — 회의를 건너뛰거나 정정해야 할 때를
// 대비해 강제 자동증가로 막아두지 않는다.
export async function addMeeting(회차: string, 회의일시: string, 회의장소: string): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  const trimmedRound = 회차.trim();
  if (!trimmedRound) throw new Error('회차를 입력해주세요.');
  const existing = await getKeyedList(LABOR_COUNCIL_ROUND_INFO_TABLE);
  const found = existing.find((r) => r.회차 === trimmedRound);
  await upsertKeyedRecord(
    LABOR_COUNCIL_ROUND_INFO_TABLE,
    { 회차: trimmedRound },
    {
      회차: trimmedRound,
      안건취합시작일: found?.안건취합시작일 ?? '',
      안건취합마감일: found?.안건취합마감일 ?? '',
      알림발송일시: found?.알림발송일시 ?? '',
      회의일시: 회의일시.trim(),
      회의장소: 회의장소.trim(),
      상태: found?.상태 === '완료' ? '완료' : '예정',
    }
  );
}

export async function setMeetingStatus(회차: string, 상태: MeetingStatus): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  const existing = await getKeyedList(LABOR_COUNCIL_ROUND_INFO_TABLE);
  const found = existing.find((r) => r.회차 === 회차);
  if (!found) throw new Error('회의를 찾을 수 없습니다.');
  await upsertKeyedRecord(LABOR_COUNCIL_ROUND_INFO_TABLE, { 회차 }, { ...found, 상태 });
}

// ── 안건 상시접수 안내 알림 ──────────────────────────────────────
export function buildAgendaCallNotificationTitle(): string {
  return '노사협의회 안건 상시 접수 안내';
}

export function buildAgendaCallNotificationContent(): string {
  return [
    '노사협의회에 상정할 업무고충·안건을 상시로 접수하고 있습니다.',
    '',
    '포털 > 인사관리 > 노사협의회 > 안건 제안에서 언제든 등록해주세요.',
  ].join('\n');
}

// 관리자는 항상 가능. 그 외에는 위원만.
export async function canSendAgendaNotification(): Promise<boolean> {
  return canEditLaborCouncilMinutes();
}

export async function sendAgendaNotification(title: string, content: string): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  const settings = await getSystemSettings();
  await jandiPostRich(settings.laborCouncilJandiWebhook, title, content);
}
