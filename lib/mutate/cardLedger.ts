import { randomUUID } from 'crypto';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { appendRecord, deleteRecord, updateRecord, updateRecords } from '@/lib/sheets/keyedTable';
import { deleteRowsFromSupabase, upsertRowsToSupabase } from '@/lib/supabase/keyedTable';
import { CARD_LEDGER_TABLE, ITEM_CHECK_PHOTO_TABLE, ITEM_CHECK_REPORT_TABLE } from '@/lib/sheets/registry';
import { getSystemSettings } from '@/lib/mutate/settings';
import { parseAmount } from '@/lib/format';

export const CARD_LEDGER_STATUS = {
  PENDING: '검수대기',
  DONE: '검수완료',
  PRINTED: '인쇄완료',
  REJECTED: '반려',
  EXEMPT: '검수불요',
} as const;

const SUPABASE_CONFIG = { tableName: CARD_LEDGER_TABLE.sheetName, primaryKey: CARD_LEDGER_TABLE.primaryKey };

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// 시트 저장은 그대로 필수(회계 원장 = 시트가 원본)로 두고, Supabase 반영만 "테이블 전체
// 재복제" 대신 "방금 쓴 행만 콕 집어 upsert"로 바꿨다 — 새 컬럼 하나가 Supabase에 없어서
// 전체 재복제가 실패하면 방금 입력한 건까지 화면에서 통째로 안 보이던 문제(2026-08-19) 때문.
async function afterCardLedgerWrite(records: Record<string, string>[]): Promise<Record<string, string>[]> {
  await upsertRowsToSupabase(SUPABASE_CONFIG, records);
  return getKeyedList(CARD_LEDGER_TABLE);
}

export async function getCardLedgerList(): Promise<Record<string, string>[]> {
  const list = await getKeyedList(CARD_LEDGER_TABLE);
  return [...list].reverse();
}

function requireFields(payload: Record<string, string>) {
  if (!payload['구분'] || !payload['사용일자'] || !payload['사용금액'] || !payload['예산과목'] || !payload['사용내역']) {
    throw new Error('구분/사용일자/사용금액/예산과목/사용내역은 필수입니다.');
  }
  if (payload['검수불요여부'] === 'Y' && !payload['검수불요사유']?.trim()) {
    throw new Error('물품검수 불요 처리 시 사유를 입력해주세요.');
  }
}

export async function needsPhoto(ledger: Record<string, string>): Promise<boolean> {
  return ledger['검수불요여부'] !== 'Y';
}

export async function needsReport(ledger: Record<string, string>, threshold?: number): Promise<boolean> {
  if (ledger['검수불요여부'] === 'Y') return false;
  const t = threshold ?? (await getSystemSettings()).itemCheckReportThreshold;
  return t > 0 && parseAmount(ledger['사용금액']) >= t;
}

export async function addCardLedgerRecord(payload: Record<string, string>): Promise<{ id: string; requests: Record<string, string>[] }> {
  requireFields(payload);
  const id = randomUUID();
  const exempt = payload['검수불요여부'] === 'Y';
  const record: Record<string, string> = {};
  CARD_LEDGER_TABLE.headers.forEach((h) => {
    if (h === 'id') record[h] = id;
    else if (h === '등록일시') record[h] = nowTimestamp();
    else if (h === '상태') record[h] = exempt ? CARD_LEDGER_STATUS.EXEMPT : CARD_LEDGER_STATUS.PENDING;
    else if (h === '반려사유') record[h] = '';
    else record[h] = payload[h] ?? '';
  });
  await appendRecord(CARD_LEDGER_TABLE, record);
  const requests = await afterCardLedgerWrite([record]);
  return { id, requests };
}

export async function updateCardLedgerRecord(
  id: string,
  payload: Record<string, string>
): Promise<Record<string, string>[]> {
  requireFields(payload);
  const existing = (await getKeyedList(CARD_LEDGER_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('수정할 내역을 찾을 수 없습니다.');
  if (existing['상태'] === CARD_LEDGER_STATUS.PRINTED) {
    throw new Error('인쇄완료(잠금)된 내역은 수정할 수 없습니다. 회계에 반려를 요청해주세요.');
  }
  const exempt = payload['검수불요여부'] === 'Y';
  const record: Record<string, string> = {};
  CARD_LEDGER_TABLE.headers.forEach((h) => {
    if (h === 'id') record[h] = id;
    else if (h === '등록일시') record[h] = existing['등록일시'];
    else if (h === '상태') record[h] = exempt ? CARD_LEDGER_STATUS.EXEMPT : existing['상태'];
    else if (h === '반려사유') record[h] = existing['반려사유'] ?? '';
    else record[h] = payload[h] ?? '';
  });
  await updateRecord(CARD_LEDGER_TABLE, { id }, record);
  const result = await afterCardLedgerWrite([record]);
  if (!exempt) await recomputeCardLedgerStatus(id);
  return result;
}

export async function deleteCardLedgerRecord(id: string): Promise<Record<string, string>[]> {
  const existing = (await getKeyedList(CARD_LEDGER_TABLE)).find((r) => r.id === id);
  if (existing?.['상태'] === CARD_LEDGER_STATUS.PRINTED) {
    throw new Error('인쇄완료(잠금)된 내역은 삭제할 수 없습니다. 회계에 반려를 요청해주세요.');
  }
  await deleteRecord(CARD_LEDGER_TABLE, { id });
  await deleteRowsFromSupabase(SUPABASE_CONFIG, [{ id }]);
  return getKeyedList(CARD_LEDGER_TABLE);
}

// 사진/조서 등록·삭제 직후 호출 — 필요 조건(사진 항상, 조서는 금액기준)이 다 채워졌는지 다시 계산해서
// 카드사용대장 자체의 상태를 검수대기 ⇄ 검수완료로 맞춘다. 인쇄완료(잠금) 상태는 회계만 바꿀 수 있으므로 건드리지 않는다.
// 호출 시점엔 이미 (카드사용대장/사진/조서) 방금 쓴 행이 건별 upsert로 Supabase에 반영된 뒤이므로,
// 시트를 통째로 다시 읽는 getAllRecords 대신 훨씬 가벼운 getKeyedList(Supabase 우선)로 읽는다 —
// 카드사용대장처럼 행이 많은 시트에서 사진/조서 하나 저장할 때마다 매번 전체를 읽어오면 느려진다.
export async function recomputeCardLedgerStatus(ledgerId: string): Promise<void> {
  if (!ledgerId) return;
  const all = await getKeyedList(CARD_LEDGER_TABLE);
  const ledger = all.find((r) => r.id === ledgerId);
  if (!ledger) return;
  if (ledger['상태'] === CARD_LEDGER_STATUS.PRINTED || ledger['검수불요여부'] === 'Y') return;

  const [photos, reports, settings] = await Promise.all([
    getKeyedList(ITEM_CHECK_PHOTO_TABLE),
    getKeyedList(ITEM_CHECK_REPORT_TABLE),
    getSystemSettings(),
  ]);
  const hasPhoto = photos.some((p) => p['카드사용대장ID'] === ledgerId);
  const reportRequired = settings.itemCheckReportThreshold > 0 && parseAmount(ledger['사용금액']) >= settings.itemCheckReportThreshold;
  const hasReport = reports.some((r) => r['카드사용대장ID'] === ledgerId);
  const complete = hasPhoto && (!reportRequired || hasReport);
  const newStatus = complete ? CARD_LEDGER_STATUS.DONE : CARD_LEDGER_STATUS.PENDING;
  if (newStatus !== ledger['상태']) {
    const record = { ...ledger, 상태: newStatus };
    await updateRecord(CARD_LEDGER_TABLE, { id: ledgerId }, record);
    await upsertRowsToSupabase(SUPABASE_CONFIG, [record]);
  }
}

// 회계 전용 — 검수완료 건만 인쇄(=잠금) 가능하다. 인쇄 이후 담당자는 해당 건을 수정/삭제할 수 없다.
export async function printCardLedgerRecord(id: string): Promise<Record<string, string>[]> {
  const existing = (await getKeyedList(CARD_LEDGER_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('내역을 찾을 수 없습니다.');
  if (existing['상태'] !== CARD_LEDGER_STATUS.DONE) {
    throw new Error('검수완료(사진/조서 등록 완료) 상태인 건만 인쇄할 수 있습니다.');
  }
  const record = { ...existing, 상태: CARD_LEDGER_STATUS.PRINTED, 반려사유: '' };
  await updateRecord(CARD_LEDGER_TABLE, { id }, record);
  return afterCardLedgerWrite([record]);
}

// 회계 전용 — 여러 건을 한 번에 인쇄(=잠금) 처리한다. 건마다 읽기+쓰기+반영을 반복하면
// 선택 건수가 많을 때 API 요청이 급증하므로, 대상 전체를 한 번만 읽고 batchUpdate/배치 upsert로 처리한다.
export async function printCardLedgerRecords(ids: string[]): Promise<Record<string, string>[]> {
  if (ids.length === 0) return getKeyedList(CARD_LEDGER_TABLE);
  const all = await getKeyedList(CARD_LEDGER_TABLE);
  const targets = ids.map((id) => {
    const existing = all.find((r) => r.id === id);
    if (!existing) throw new Error(`내역을 찾을 수 없습니다: ${id}`);
    if (existing['상태'] !== CARD_LEDGER_STATUS.DONE) {
      throw new Error(`검수완료 상태인 건만 인쇄할 수 있습니다: ${existing['사용내역'] || id}`);
    }
    return existing;
  });
  const records: Record<string, string>[] = targets.map((existing) => ({ ...existing, 상태: CARD_LEDGER_STATUS.PRINTED, 반려사유: '' }));
  await updateRecords(
    CARD_LEDGER_TABLE,
    records.map((record) => ({ keyValues: { id: record.id }, record }))
  );
  return afterCardLedgerWrite(records);
}

// 관리자가 검수사진 미등록 건에 잔디 알림을 보낸 뒤 "마지막 알림" 시각을 기록한다.
export async function markCardLedgerNotified(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const all = await getKeyedList(CARD_LEDGER_TABLE);
  const now = nowTimestamp();
  const targets = ids
    .map((id) => all.find((r) => r.id === id))
    .filter((r): r is Record<string, string> => Boolean(r));
  if (targets.length === 0) return;
  const records: Record<string, string>[] = targets.map((existing) => ({ ...existing, 마지막알림일시: now }));
  await updateRecords(
    CARD_LEDGER_TABLE,
    records.map((record) => ({ keyValues: { id: record.id }, record }))
  );
  await upsertRowsToSupabase(SUPABASE_CONFIG, records);
}

// 회계 전용 — 인쇄(잠금)된 건을 반려하면 잠금이 풀리고 담당자가 다시 수정/재등록할 수 있게 된다.
export async function rejectCardLedgerRecord(id: string, reason: string): Promise<Record<string, string>[]> {
  if (!reason?.trim()) throw new Error('반려 사유를 입력해주세요.');
  const existing = (await getKeyedList(CARD_LEDGER_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('내역을 찾을 수 없습니다.');
  if (existing['상태'] !== CARD_LEDGER_STATUS.PRINTED) {
    throw new Error('인쇄완료 상태인 건만 반려할 수 있습니다.');
  }
  const record = { ...existing, 상태: CARD_LEDGER_STATUS.REJECTED, 반려사유: reason.trim() };
  await updateRecord(CARD_LEDGER_TABLE, { id }, record);
  return afterCardLedgerWrite([record]);
}
