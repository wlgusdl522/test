import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { CARD_LEDGER_TABLE } from '@/lib/sheets/registry';

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function getCardLedgerList(): Promise<Record<string, string>[]> {
  const list = await getKeyedList(CARD_LEDGER_TABLE);
  return [...list].reverse();
}

function requireFields(payload: Record<string, string>) {
  if (!payload['구분'] || !payload['사용일자'] || !payload['사용금액'] || !payload['예산과목'] || !payload['사용내역']) {
    throw new Error('구분/사용일자/사용금액/예산과목/사용내역은 필수입니다.');
  }
}

export async function addCardLedgerRecord(payload: Record<string, string>): Promise<Record<string, string>[]> {
  requireFields(payload);
  const record: Record<string, string> = {};
  CARD_LEDGER_TABLE.headers.forEach((h) => {
    if (h === 'id') record[h] = randomUUID();
    else if (h === '등록일시') record[h] = nowTimestamp();
    else record[h] = payload[h] ?? '';
  });
  return addKeyedRecord(CARD_LEDGER_TABLE, record);
}

export async function updateCardLedgerRecord(
  id: string,
  payload: Record<string, string>
): Promise<Record<string, string>[]> {
  const existing = (await getKeyedList(CARD_LEDGER_TABLE)).find((r) => r.id === id);
  if (!existing) throw new Error('수정할 내역을 찾을 수 없습니다.');
  const record: Record<string, string> = {};
  CARD_LEDGER_TABLE.headers.forEach((h) => {
    if (h === 'id') record[h] = id;
    else if (h === '등록일시') record[h] = existing['등록일시'];
    else record[h] = payload[h] ?? '';
  });
  return updateKeyedRecord(CARD_LEDGER_TABLE, { id }, record);
}

export async function deleteCardLedgerRecord(id: string): Promise<Record<string, string>[]> {
  return deleteKeyedRecord(CARD_LEDGER_TABLE, { id });
}
