import { randomUUID } from 'crypto';
import { addKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { MEETING_TABLE } from '@/lib/sheets/registry';

export async function getMeetingRecords(): Promise<Record<string, string>[]> {
  return getKeyedList(MEETING_TABLE);
}

export async function getMeetingMeta(team: string, meetingDate: string): Promise<Record<string, string> | null> {
  const all = await getMeetingRecords();
  return all.find((r) => r['소속팀'] === team && r['회의일자'] === meetingDate) ?? null;
}

export async function upsertMeetingMeta(payload: Record<string, string>): Promise<Record<string, string>[]> {
  if (!payload['소속팀'] || !payload['회의일자']) {
    throw new Error('소속팀과 회의일자는 필수입니다.');
  }
  const existing = await getMeetingMeta(payload['소속팀'], payload['회의일자']);
  const id = existing?.id ?? randomUUID();
  const record: Record<string, string> = {};
  MEETING_TABLE.headers.forEach((h) => {
    record[h] = h === 'id' ? id : payload[h] ?? '';
  });
  if (existing) {
    return updateKeyedRecord(MEETING_TABLE, { id }, record);
  }
  return addKeyedRecord(MEETING_TABLE, record);
}
