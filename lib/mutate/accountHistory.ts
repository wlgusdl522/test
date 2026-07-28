import { randomUUID } from 'crypto';
import { addKeyedRecord, getKeyedList } from '@/lib/mutate/keyedTable';
import { ACCOUNT_HISTORY_TABLE } from '@/lib/sheets/registry';

export async function getAccountHistory(): Promise<Record<string, string>[]> {
  return getKeyedList(ACCOUNT_HISTORY_TABLE);
}

export async function addAccountHistory(payload: Record<string, string>): Promise<Record<string, string>[]> {
  if (!payload['처리구분'] || !payload['신규 이메일(계정)']) {
    throw new Error('처리구분과 신규 이메일(계정)은 필수입니다.');
  }
  if (payload['처리구분'] === '계정인계' && !payload['이전 이메일(계정)']) {
    throw new Error('계정인계는 이전 이메일(계정)을 입력해야 합니다.');
  }

  const record: Record<string, string> = {};
  ACCOUNT_HISTORY_TABLE.headers.forEach((h) => {
    record[h] = h === 'id' ? randomUUID() : payload[h] ?? '';
  });
  return addKeyedRecord(ACCOUNT_HISTORY_TABLE, record);
}
