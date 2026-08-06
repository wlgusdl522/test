import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
import { parseAmount } from '@/lib/format';

// 구글시트를 거치지 않고 Supabase에 직접 읽고 쓰는 테이블 — 나머지 앱과 달리 시트 미러링이 없다.
const CARD_TABLE = '교통카드목록';
const LEDGER_TABLE = '교통카드사용대장';

export type TransitCard = { 카드ID: string; 카드명: string; 초기잔액: string };
export type TransitLedgerRecord = Record<string, string>;

// getSupabaseServerClient()는 스키마 제네릭이 없어 .insert()/.update() 인자가 never로 좁혀진다
// (lib/supabase/keyedTable.ts의 동일한 as any 우회를 그대로 따름).
function table(tableName: string) {
  return getSupabaseServerClient().from(tableName) as any;
}

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function getTransitCardList(): Promise<TransitCard[]> {
  const { data, error } = await table(CARD_TABLE).select('*').order('카드ID');
  if (error) throw new Error(error.message);
  return (data ?? []) as TransitCard[];
}

export async function addTransitCard(payload: { 카드ID: string; 카드명: string; 초기잔액: string }): Promise<void> {
  const cardId = payload.카드ID.trim();
  if (!cardId) throw new Error('카드ID를 입력해주세요.');
  const { error } = await table(CARD_TABLE).insert({ 카드ID: cardId, 카드명: payload.카드명 ?? '', 초기잔액: payload.초기잔액 ?? '' });
  if (error) throw new Error(error.message);
}

export async function updateTransitCard(
  oldCardId: string,
  payload: { 카드ID: string; 카드명: string; 초기잔액: string }
): Promise<void> {
  const cardId = payload.카드ID.trim();
  if (!cardId) throw new Error('카드ID를 입력해주세요.');
  const { error } = await table(CARD_TABLE)
    .update({ 카드ID: cardId, 카드명: payload.카드명 ?? '', 초기잔액: payload.초기잔액 ?? '' })
    .eq('카드ID', oldCardId);
  if (error) throw new Error(error.message);
}

export async function deleteTransitCard(cardId: string): Promise<void> {
  const { error } = await table(CARD_TABLE).delete().eq('카드ID', cardId);
  if (error) throw new Error(error.message);
}

export async function getTransitLedgerList(): Promise<TransitLedgerRecord[]> {
  const { data, error } = await table(LEDGER_TABLE).select('*').order('사용일자', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TransitLedgerRecord[];
}

function requireLedgerFields(payload: Record<string, string>) {
  if (!payload['교통카드'] || !payload['사용일자'] || !payload['목적']) {
    throw new Error('교통카드/사용일자/목적은 필수입니다.');
  }
}

export async function addTransitLedgerRecord(payload: Record<string, string>): Promise<TransitLedgerRecord> {
  requireLedgerFields(payload);
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const record: TransitLedgerRecord = {
    id: randomUUID(),
    교통카드: payload['교통카드'],
    사용일자: payload['사용일자'],
    담당자이메일: viewerEmail,
    담당자명: me?.성명 ?? '',
    목적: payload['목적'],
    출발지: payload['출발지'] ?? '',
    도착지: payload['도착지'] ?? '',
    교통수단: payload['교통수단'] ?? '',
    충전액: payload['충전액'] ?? '',
    사용액: payload['사용액'] ?? '',
    등록일시: nowTimestamp(),
  };
  const { error } = await table(LEDGER_TABLE).insert(record);
  if (error) throw new Error(error.message);
  return record;
}

export async function updateTransitLedgerRecord(id: string, payload: Record<string, string>): Promise<void> {
  requireLedgerFields(payload);
  const { error } = await table(LEDGER_TABLE)
    .update({
      교통카드: payload['교통카드'],
      사용일자: payload['사용일자'],
      목적: payload['목적'],
      출발지: payload['출발지'] ?? '',
      도착지: payload['도착지'] ?? '',
      교통수단: payload['교통수단'] ?? '',
      충전액: payload['충전액'] ?? '',
      사용액: payload['사용액'] ?? '',
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTransitLedgerRecord(id: string): Promise<void> {
  const { error } = await table(LEDGER_TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// 전월이월액/행별 잔액 계산 — 원래 스프레드시트 수식(초기잔액 + 누적충전액 - 누적사용액)을 그대로 옮긴 것.
export function sumFlowsThrough(
  cardId: string,
  records: TransitLedgerRecord[],
  throughDateInclusive: string
): { charge: number; use: number } {
  let charge = 0;
  let use = 0;
  for (const r of records) {
    if (r['교통카드'] !== cardId) continue;
    if (r['사용일자'] > throughDateInclusive) continue;
    charge += parseAmount(r['충전액']);
    use += parseAmount(r['사용액']);
  }
  return { charge, use };
}
