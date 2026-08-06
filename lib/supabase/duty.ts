import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from './server';
import { getSetting, setSetting } from './settings';
import { getStaffList } from '@/lib/mutate/staff';
import { uploadImageDataUrl, deleteDriveFileFromUrl } from '@/lib/drive/upload';
import { DUTY_SIGNATURE_FOLDER_ID } from '@/lib/sheets/sheetIds';
import { addDays, todayISO } from '@/lib/dutyDate';
import { parseSwapChain } from '@/lib/dutySwapChain';

// 당직근무는 이 기능만 예외로 Supabase가 원본이다(다른 기능은 전부 Google Sheets가 원본, Supabase는 캐시).
// 그래서 lib/supabase/keyedTable.ts(시트→Supabase 미러 전제)를 쓰지 않고, 이 파일에서 직접 select/insert/update/delete한다.

export type DutyOrderType = 'weekday' | 'saturday';

const ORDER_TABLE: Record<DutyOrderType, string> = {
  weekday: '당직순서_평일',
  saturday: '당직순서_토요',
};

const LOG_TABLE: Record<DutyOrderType, string> = {
  weekday: '당직근무일지_평일',
  saturday: '당직근무일지_토요',
};

// getSupabaseServerClient().from(name)는 스키마 타입이 없어 테이블명을 문자열로 넘기면
// TS가 컬럼 타입을 추론 못 한다(lib/supabase/keyedTable.ts의 table()과 동일한 이유로 any 처리).
function table(name: string) {
  return getSupabaseServerClient().from(name) as any;
}

function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) out[k] = '';
    else out[k] = String(v);
  }
  return out;
}

// ── 당직순서(평일/토요) ─────────────────────────────────────────────

export type DutyOrderItem = { id: string; 이메일: string; 성명: string; 정렬순서: number };

export async function getDutyOrder(type: DutyOrderType): Promise<DutyOrderItem[]> {
  const { data, error } = await table(ORDER_TABLE[type]).select('*').order('정렬순서', { ascending: true });
  if (error) throw new Error(`당직순서 조회 실패: ${error.message}`);
  return (data ?? []) as DutyOrderItem[];
}

export async function addDutyOrderPerson(type: DutyOrderType, 이메일: string, 성명: string): Promise<void> {
  const current = await getDutyOrder(type);
  if (current.some((c) => c.이메일 === 이메일)) {
    throw new Error(`이미 순서에 등록된 사람입니다: ${성명}`);
  }
  const next정렬순서 = current.length ? Math.max(...current.map((c) => c.정렬순서)) + 1 : 1;
  const { error } = await table(ORDER_TABLE[type]).insert({ id: randomUUID(), 이메일, 성명, 정렬순서: next정렬순서 });
  if (error) throw new Error(`당직순서 추가 실패: ${error.message}`);
}

export async function removeDutyOrderPerson(type: DutyOrderType, id: string): Promise<void> {
  const { error } = await table(ORDER_TABLE[type]).delete().eq('id', id);
  if (error) throw new Error(`당직순서 삭제 실패: ${error.message}`);
}

export async function moveDutyOrderPerson(type: DutyOrderType, id: string, direction: 'up' | 'down'): Promise<void> {
  const list = await getDutyOrder(type);
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error('순서를 찾을 수 없습니다.');
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return;

  const a = list[idx];
  const b = list[targetIdx];
  const tableName = ORDER_TABLE[type];
  const { error: e1 } = await table(tableName).update({ 정렬순서: b.정렬순서 }).eq('id', a.id);
  const { error: e2 } = await table(tableName).update({ 정렬순서: a.정렬순서 }).eq('id', b.id);
  if (e1 || e2) throw new Error(`순서 변경 실패: ${e1?.message ?? e2?.message}`);
}

// ── 당직공휴일 ─────────────────────────────────────────────────────

export type DutyHoliday = { 날짜: string; 휴일명: string };

export async function getDutyHolidays(): Promise<DutyHoliday[]> {
  const { data, error } = await table('당직공휴일').select('*').order('날짜', { ascending: true });
  if (error) throw new Error(`공휴일 조회 실패: ${error.message}`);
  return (data ?? []) as DutyHoliday[];
}

export async function addDutyHoliday(날짜: string, 휴일명: string): Promise<void> {
  if (!날짜 || !휴일명.trim()) throw new Error('날짜와 휴일명을 입력해주세요.');
  const { error } = await table('당직공휴일').upsert({ 날짜, 휴일명: 휴일명.trim() });
  if (error) throw new Error(`공휴일 추가 실패: ${error.message}`);
}

export async function deleteDutyHoliday(날짜: string): Promise<void> {
  const { error } = await table('당직공휴일').delete().eq('날짜', 날짜);
  if (error) throw new Error(`공휴일 삭제 실패: ${error.message}`);
}

// ── 당직제외목록(기간 한정) ──────────────────────────────────────────

export type DutyExclusion = { id: string; 이메일: string; 성명: string; 시작일: string; 종료일: string; 사유: string };

export async function getDutyExclusions(): Promise<DutyExclusion[]> {
  const { data, error } = await table('당직제외목록').select('*').order('시작일', { ascending: false });
  if (error) throw new Error(`제외목록 조회 실패: ${error.message}`);
  return (data ?? []) as DutyExclusion[];
}

export async function addDutyExclusion(payload: Omit<DutyExclusion, 'id'>): Promise<void> {
  if (!payload.이메일 || !payload.시작일 || !payload.종료일) {
    throw new Error('이메일/시작일/종료일은 필수입니다.');
  }
  const { error } = await table('당직제외목록').insert({ id: randomUUID(), ...payload });
  if (error) throw new Error(`제외목록 추가 실패: ${error.message}`);
}

export async function deleteDutyExclusion(id: string): Promise<void> {
  const { error } = await table('당직제외목록').delete().eq('id', id);
  if (error) throw new Error(`제외목록 삭제 실패: ${error.message}`);
}

// ── 근무일지(평일/토요) 조회 ──────────────────────────────────────────

export async function getDutyWeekdayLogs(): Promise<Record<string, string>[]> {
  const { data, error } = await table(LOG_TABLE.weekday).select('*').order('근무일자', { ascending: false });
  if (error) throw new Error(`평일당직근무일지 조회 실패: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeRow);
}

export async function getDutySaturdayLogs(): Promise<Record<string, string>[]> {
  const { data, error } = await table(LOG_TABLE.saturday).select('*').order('근무일자', { ascending: false });
  if (error) throw new Error(`토요당직근무일지 조회 실패: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeRow);
}

export async function getDutyLog(type: DutyOrderType, id: string): Promise<Record<string, string> | null> {
  const { data, error } = await table(LOG_TABLE[type]).select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

// ── 배정 생성(2개월 배포) ────────────────────────────────────────────

type ExclusionCheck = (이메일: string, dateStr: string, isSaturday: boolean) => boolean;

function buildExclusionCheck(
  staffByEmail: Map<string, Record<string, string>>,
  exclusions: DutyExclusion[]
): ExclusionCheck {
  return (이메일, dateStr, isSaturday) => {
    const s = staffByEmail.get(이메일);
    if (!s) return true;
    if (s['재직상태'] !== '재직') return true;
    if (s['당직대상여부'] === 'N') return true;
    if (isSaturday && s['토요당직제외여부'] === 'Y') return true;
    return exclusions.some((e) => e.이메일 === 이메일 && dateStr >= e.시작일 && dateStr <= e.종료일);
  };
}

function pickNextFromOrder(
  order: DutyOrderItem[],
  cursor: number,
  count: number,
  dateStr: string,
  isSaturday: boolean,
  isExcluded: ExclusionCheck
): { picked: DutyOrderItem[]; nextCursor: number } {
  const picked: DutyOrderItem[] = [];
  let c = cursor;
  let attempts = 0;
  while (picked.length < count && attempts < order.length) {
    const person = order[c % order.length];
    c++;
    attempts++;
    if (!isExcluded(person.이메일, dateStr, isSaturday)) picked.push(person);
  }
  return { picked, nextCursor: c % order.length };
}

export type GenerateDutyBatchResult = { 평일생성: number; 토요생성: number; 건너뜀: string[] };

export async function generateDutyBatch(startDate: string, endDate: string): Promise<GenerateDutyBatchResult> {
  const [staff, holidays, exclusions, weekdayOrder, saturdayOrder, existingWeekday, existingSaturday] =
    await Promise.all([
      getStaffList(),
      getDutyHolidays(),
      getDutyExclusions(),
      getDutyOrder('weekday'),
      getDutyOrder('saturday'),
      getDutyWeekdayLogs(),
      getDutySaturdayLogs(),
    ]);

  if (!weekdayOrder.length) throw new Error('평일 당직순서를 먼저 등록해주세요.');
  if (!saturdayOrder.length) throw new Error('토요 당직순서를 먼저 등록해주세요.');

  const staffByEmail = new Map(staff.map((s) => [s['이메일(아이디)'], s]));
  const holidaySet = new Set(holidays.map((h) => h.날짜));
  const existingWeekdayDates = new Set(existingWeekday.map((r) => r.근무일자));
  const existingSaturdayDates = new Set(existingSaturday.map((r) => r.근무일자));
  const isExcluded = buildExclusionCheck(staffByEmail, exclusions);

  let weekdayCursor = parseInt((await getSetting('duty_weekday_cursor')) || '0', 10) || 0;
  let saturdayCursor = parseInt((await getSetting('duty_saturday_cursor')) || '0', 10) || 0;

  const weekdayInserts: Record<string, string | number>[] = [];
  const saturdayInserts: Record<string, string | number>[] = [];
  const skipped: string[] = [];

  let dateStr = startDate;
  while (dateStr <= endDate) {
    const dow = new Date(`${dateStr}T00:00:00`).getDay(); // 0=일 ~ 6=토

    if (dow === 0) {
      dateStr = addDays(dateStr, 1);
      continue;
    }
    if (holidaySet.has(dateStr)) {
      dateStr = addDays(dateStr, 1);
      continue;
    }

    if (dow === 6) {
      if (!existingSaturdayDates.has(dateStr)) {
        const { picked, nextCursor } = pickNextFromOrder(saturdayOrder, saturdayCursor, 2, dateStr, true, isExcluded);
        saturdayCursor = nextCursor;
        if (picked.length === 2) {
          const [p1, p2] = picked;
          saturdayInserts.push({
            id: randomUUID(),
            근무일자: dateStr,
            소속1: staffByEmail.get(p1.이메일)?.['소속팀'] ?? '',
            이메일1: p1.이메일,
            이름1: p1.성명,
            소속2: staffByEmail.get(p2.이메일)?.['소속팀'] ?? '',
            이메일2: p2.이메일,
            이름2: p2.성명,
          });
        } else {
          skipped.push(`${dateStr}(토, 배정 가능 인원 부족)`);
        }
      }
    } else {
      if (!existingWeekdayDates.has(dateStr)) {
        const { picked, nextCursor } = pickNextFromOrder(weekdayOrder, weekdayCursor, 1, dateStr, false, isExcluded);
        weekdayCursor = nextCursor;
        if (picked.length === 1) {
          const p = picked[0];
          weekdayInserts.push({
            id: randomUUID(),
            근무일자: dateStr,
            소속: staffByEmail.get(p.이메일)?.['소속팀'] ?? '',
            이메일: p.이메일,
            이름: p.성명,
          });
        } else {
          skipped.push(`${dateStr}(평일, 배정 가능 인원 부족)`);
        }
      }
    }
    dateStr = addDays(dateStr, 1);
  }

  if (weekdayInserts.length) {
    const { error } = await table(LOG_TABLE.weekday).insert(weekdayInserts);
    if (error) throw new Error(`평일 배정 저장 실패: ${error.message}`);
  }
  if (saturdayInserts.length) {
    const { error } = await table(LOG_TABLE.saturday).insert(saturdayInserts);
    if (error) throw new Error(`토요 배정 저장 실패: ${error.message}`);
  }
  await setSetting('duty_weekday_cursor', String(weekdayCursor));
  await setSetting('duty_saturday_cursor', String(saturdayCursor));

  return { 평일생성: weekdayInserts.length, 토요생성: saturdayInserts.length, 건너뜀: skipped };
}

// ── 교체(당사자끼리 배정 변경) ───────────────────────────────────────

// 교체가 여러 번(A→B→C ...) 일어나도 전체 이력을 보여줄 수 있게, '원배정이메일/원배정성명'
// (토요는 슬롯별로 원배정이메일1/2, 원배정성명1/2)에 지금까지 거쳐간 이메일/이름을 JSON
// 배열 문자열로 계속 이어붙인다 — 마지막 값만 남기던 이전 방식(원래 담당자 vs 현재 담당자)을
// 대체한다. 화면에서는 [...이 배열, 현재이름].join('→')로 전체 체인을 보여준다(lib/dutySwapChain.ts).
export async function swapDutyAssignment(
  type: DutyOrderType,
  id: string,
  slot: 1 | 2,
  newEmail: string,
  newName: string,
  newTeam: string
): Promise<void> {
  const row = await getDutyLog(type, id);
  if (!row) throw new Error('배정을 찾을 수 없습니다.');

  const tableName = LOG_TABLE[type];
  const patch: Record<string, string> = {};
  const emailKey = type === 'weekday' ? '이메일' : `이메일${slot}`;
  const nameKey = type === 'weekday' ? '이름' : `이름${slot}`;
  const teamKey = type === 'weekday' ? '소속' : `소속${slot}`;
  const chainEmailKey = type === 'weekday' ? '원배정이메일' : `원배정이메일${slot}`;
  const chainNameKey = type === 'weekday' ? '원배정성명' : `원배정성명${slot}`;

  const pastEmails = parseSwapChain(row[chainEmailKey]);
  const pastNames = parseSwapChain(row[chainNameKey]);
  patch[chainEmailKey] = JSON.stringify([...pastEmails, row[emailKey]]);
  patch[chainNameKey] = JSON.stringify([...pastNames, row[nameKey]]);
  patch[emailKey] = newEmail;
  patch[nameKey] = newName;
  patch[teamKey] = newTeam;

  const { error } = await table(tableName).update(patch).eq('id', id);
  if (error) throw new Error(`교체 실패: ${error.message}`);
}

// ── 설정 변경(제외/순서) 적용 — 오늘 이후, 아직 서명 안 된 배정만 재검토 ──────

export type ReapplyExclusionsResult = { 평일교체: number; 토요교체: number };

// 육아휴직/임신 등으로 직원을 갑자기 제외 목록에 추가했을 때, 이미 만들어져 있던 미래 배정
// 중 그 직원이 들어간 건을 순서상 다음 사람으로 자동 교체한다. 이미 서명(작성)된 배정은
// 지나간 일로 보고 건드리지 않는다.
export async function reapplyDutyExclusions(): Promise<ReapplyExclusionsResult> {
  const today = todayISO();
  const [staff, exclusions, weekdayOrder, saturdayOrder, weekdayLogs, saturdayLogs] = await Promise.all([
    getStaffList(),
    getDutyExclusions(),
    getDutyOrder('weekday'),
    getDutyOrder('saturday'),
    getDutyWeekdayLogs(),
    getDutySaturdayLogs(),
  ]);

  const staffByEmail = new Map(staff.map((s) => [s['이메일(아이디)'], s]));
  const isExcluded = buildExclusionCheck(staffByEmail, exclusions);

  let weekdayCursor = parseInt((await getSetting('duty_weekday_cursor')) || '0', 10) || 0;
  let saturdayCursor = parseInt((await getSetting('duty_saturday_cursor')) || '0', 10) || 0;

  let weekdayReplaced = 0;
  const futureWeekday = weekdayLogs
    .filter((r) => r.근무일자 >= today && !r.사인)
    .sort((a, b) => a.근무일자.localeCompare(b.근무일자));
  for (const row of futureWeekday) {
    if (!row.이메일 || !isExcluded(row.이메일, row.근무일자, false)) continue;
    const { picked, nextCursor } = pickNextFromOrder(weekdayOrder, weekdayCursor, 1, row.근무일자, false, isExcluded);
    weekdayCursor = nextCursor;
    if (picked.length === 1) {
      const p = picked[0];
      await swapDutyAssignment('weekday', row.id, 1, p.이메일, p.성명, staffByEmail.get(p.이메일)?.['소속팀'] ?? '');
      weekdayReplaced++;
    }
  }

  let saturdayReplaced = 0;
  const futureSaturday = saturdayLogs
    .filter((r) => r.근무일자 >= today)
    .sort((a, b) => a.근무일자.localeCompare(b.근무일자));
  for (const row of futureSaturday) {
    for (const slot of [1, 2] as const) {
      const email = row[`이메일${slot}`];
      const signed = row[`사인${slot}`];
      if (!email || signed || !isExcluded(email, row.근무일자, true)) continue;
      const otherSlotEmail = row[`이메일${slot === 1 ? 2 : 1}`];
      const isExcludedOrOtherSlot: ExclusionCheck = (e, d, sat) => e === otherSlotEmail || isExcluded(e, d, sat);
      const { picked, nextCursor } = pickNextFromOrder(saturdayOrder, saturdayCursor, 1, row.근무일자, true, isExcludedOrOtherSlot);
      saturdayCursor = nextCursor;
      if (picked.length === 1) {
        const p = picked[0];
        await swapDutyAssignment('saturday', row.id, slot, p.이메일, p.성명, staffByEmail.get(p.이메일)?.['소속팀'] ?? '');
        saturdayReplaced++;
      }
    }
  }

  await setSetting('duty_weekday_cursor', String(weekdayCursor));
  await setSetting('duty_saturday_cursor', String(saturdayCursor));
  return { 평일교체: weekdayReplaced, 토요교체: saturdayReplaced };
}

// ── 근무일지 작성(체크리스트/서명) ────────────────────────────────────

export async function saveDutyWeekdayLog(
  id: string,
  fields: Record<string, string>,
  signatureDataUrl?: string
): Promise<void> {
  const patch: Record<string, string> = { ...fields };
  if (signatureDataUrl) {
    const existing = await getDutyLog('weekday', id);
    if (existing?.['사인']) await deleteDriveFileFromUrl(existing['사인']);
    patch['사인'] = await uploadImageDataUrl(signatureDataUrl, `weekday-${id}`, DUTY_SIGNATURE_FOLDER_ID);
  }
  const { error } = await table(LOG_TABLE.weekday).update(patch).eq('id', id);
  if (error) throw new Error(`근무일지 저장 실패: ${error.message}`);
}

export async function saveDutySaturdaySignature(id: string, slot: 1 | 2, signatureDataUrl: string): Promise<void> {
  const existing = await getDutyLog('saturday', id);
  if (!existing) throw new Error('근무일지를 찾을 수 없습니다.');
  const signCol = `사인${slot}`;
  if (existing[signCol]) await deleteDriveFileFromUrl(existing[signCol]);
  const url = await uploadImageDataUrl(signatureDataUrl, `saturday-${id}-${slot}`, DUTY_SIGNATURE_FOLDER_ID);
  const { error } = await table(LOG_TABLE.saturday)
    .update({ [signCol]: url })
    .eq('id', id);
  if (error) throw new Error(`서명 저장 실패: ${error.message}`);
}
