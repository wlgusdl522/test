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

// 노사협의회 — 안건취합(전 직원 제출) → 회의록(위원만 작성, 안건별 근로자/사용자 의견+의결내용을
// 병기) 흐름을 그대로 옮긴 것. 참고자료(45차 안건취합.hwp, 44차 회의록.hwp) 서식 기준.

export type LaborCouncilMemberType = '근로자위원' | '사용자위원';

export type LaborCouncilMember = { 이메일: string; 성명: string; 구분: LaborCouncilMemberType; 정렬순서: number };

export type LaborCouncilAgendaItem = {
  id: string;
  회차: string;
  이메일: string;
  성명: string;
  항목명: string;
  제안내용: string;
  등록일시: string;
};

export type ResolutionRow = { 안건제목: string; 근로자의견: string; 사용자의견: string; 의결내용: string };
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
// 회의록을 작성·수정할 수 있다 — "정해진 위원들만" 편집, 나머지 직원은 조회만.
export async function canEditLaborCouncilMinutes(): Promise<boolean> {
  const email = await requireViewerEmail();
  if (await isAdminEmail(email)) return true;
  return isLaborCouncilMember(email);
}

export async function requireCanEditLaborCouncilMinutes(): Promise<void> {
  if (!(await canEditLaborCouncilMinutes())) {
    throw new Error('회의록 작성/수정은 노사협의회 위원만 할 수 있습니다.');
  }
}

function parseRoundNumber(회차: string): number {
  const n = Number(회차.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export async function getAgendaRounds(): Promise<string[]> {
  const [agenda, minutes] = await Promise.all([
    getKeyedList(LABOR_COUNCIL_AGENDA_TABLE),
    getKeyedList(LABOR_COUNCIL_MINUTES_TABLE),
  ]);
  const rounds = new Set<string>();
  agenda.forEach((r) => r.회차 && rounds.add(r.회차));
  minutes.forEach((r) => r.회차 && rounds.add(r.회차));
  return [...rounds].sort((a, b) => parseRoundNumber(b) - parseRoundNumber(a));
}

export async function getNextRound(): Promise<string> {
  const rounds = await getAgendaRounds();
  const max = Math.max(0, ...rounds.map(parseRoundNumber));
  return String(max + 1);
}

export async function getAgendaItems(회차: string): Promise<LaborCouncilAgendaItem[]> {
  const rows = await getKeyedList(LABOR_COUNCIL_AGENDA_TABLE);
  return rows
    .filter((r) => r.회차 === 회차)
    .map((r) => ({
      id: r.id,
      회차: r.회차,
      이메일: r.이메일,
      성명: r.성명,
      항목명: r.항목명,
      제안내용: r.제안내용,
      등록일시: r.등록일시,
    }))
    .sort((a, b) => a.등록일시.localeCompare(b.등록일시));
}

export async function addAgendaItem(
  회차: string,
  항목명: string,
  제안내용: string,
  email: string,
  name: string
): Promise<void> {
  const trimmedRound = 회차.trim();
  const trimmedItem = 항목명.trim();
  const trimmedContent = 제안내용.trim();
  if (!trimmedRound) throw new Error('회차를 입력해주세요.');
  if (!trimmedItem && !trimmedContent) throw new Error('항목명 또는 제안내용을 입력해주세요.');
  await addKeyedRecord(LABOR_COUNCIL_AGENDA_TABLE, {
    id: randomUUID(),
    회차: trimmedRound,
    이메일: email,
    성명: name,
    항목명: trimmedItem,
    제안내용: trimmedContent,
    등록일시: nowTimestamp(),
  });
}

// 삭제(취합 정리)는 위원만 — 본인이 낸 안건이라도 전체 직원이 서로 지울 수 있으면 곤란하므로.
export async function deleteAgendaItem(id: string): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  await deleteKeyedRecord(LABOR_COUNCIL_AGENDA_TABLE, { id });
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

// 저장된 회의록이 없으면, 이번 회차 안건취합 항목을 협의의결 초안(근로자의견 자리에 제안내용을
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

  const [agendaItems, members] = await Promise.all([getAgendaItems(회차), getLaborCouncilMembers()]);
  return {
    회차,
    회의일시: '',
    회의장소: '',
    협의의결: agendaItems.map((a) => ({ 안건제목: a.항목명, 근로자의견: a.제안내용, 사용자의견: '', 의결내용: '' })),
    보고사항: '',
    의결된사항: '',
    참석자: members.map((m) => ({ 이메일: m.이메일, 성명: m.성명, 구분: m.구분, 참석: true })),
    등록일시: '',
    최종수정이메일: '',
  };
}

export type LaborCouncilRoundInfo = {
  회차: string;
  안건취합시작일: string;
  안건취합마감일: string;
  알림발송일시: string;
};

export async function getRoundInfo(회차: string): Promise<LaborCouncilRoundInfo> {
  const rows = await getKeyedList(LABOR_COUNCIL_ROUND_INFO_TABLE);
  const found = rows.find((r) => r.회차 === 회차);
  return {
    회차,
    안건취합시작일: found?.안건취합시작일 ?? '',
    안건취합마감일: found?.안건취합마감일 ?? '',
    알림발송일시: found?.알림발송일시 ?? '',
  };
}

// 안건취합 기간 지정은 위원만 — 아무나 마감일을 바꾸면 회의 준비 일정이 흔들리므로.
export async function setRoundInfo(회차: string, 안건취합시작일: string, 안건취합마감일: string): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  const existing = await getRoundInfo(회차);
  await upsertKeyedRecord(
    LABOR_COUNCIL_ROUND_INFO_TABLE,
    { 회차 },
    {
      회차,
      안건취합시작일: 안건취합시작일.trim(),
      안건취합마감일: 안건취합마감일.trim(),
      알림발송일시: existing.알림발송일시,
    }
  );
}

// 오늘(YYYY-MM-DD, KST 기준은 호출부에서 계산해 넘김)이 안건취합 기간 안에 있는지 — 기간을 아예
// 안 정했으면(둘 다 빈값) 제한 없음으로 취급해서 위원이 굳이 기간을 지정하지 않아도 예전처럼
// 계속 등록받을 수 있게 한다.
export function isWithinAgendaPeriod(info: LaborCouncilRoundInfo, todayYmd: string): boolean {
  if (!info.안건취합시작일 && !info.안건취합마감일) return true;
  if (info.안건취합시작일 && todayYmd < info.안건취합시작일) return false;
  if (info.안건취합마감일 && todayYmd > info.안건취합마감일) return false;
  return true;
}

export function buildAgendaNotificationTitle(회차: string): string {
  return `제 ${회차}차 노사협의회 안건취합 안내`;
}

export function buildAgendaNotificationContent(info: LaborCouncilRoundInfo): string {
  const lines = ['노사협의회에 상정할 업무고충·안건을 취합합니다.', ''];
  if (info.안건취합시작일 || info.안건취합마감일) {
    lines.push(` - 취합기간 : ${info.안건취합시작일 || '제한없음'} ~ ${info.안건취합마감일 || '제한없음'}`);
  }
  lines.push('', '포털 > 인사관리 > 노사협의회에서 등록해주세요.');
  return lines.join('\n');
}

// 관리자는 항상 가능. 그 외에는 위원만 — 알림 발송도 위원이 기간을 설정하는 것과 같은 권한으로 묶는다.
export async function canSendAgendaNotification(): Promise<boolean> {
  return canEditLaborCouncilMinutes();
}

export async function sendAgendaNotification(회차: string, title: string, content: string): Promise<void> {
  await requireCanEditLaborCouncilMinutes();
  const [info, settings] = await Promise.all([getRoundInfo(회차), getSystemSettings()]);
  await jandiPostRich(settings.laborCouncilJandiWebhook, title, content);
  await upsertKeyedRecord(
    LABOR_COUNCIL_ROUND_INFO_TABLE,
    { 회차 },
    {
      회차,
      안건취합시작일: info.안건취합시작일,
      안건취합마감일: info.안건취합마감일,
      알림발송일시: nowTimestamp(),
    }
  );
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
