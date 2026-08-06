import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { GENERAL_LOG_ITEM_TABLE } from '@/lib/sheets/registry';

export type GeneralLogItem = {
  id: string;
  사업명: string;
  대분류: string;
  중분류: string;
  세부항목: string;
  정렬순서: number;
  목표건: string;
  목표명: string;
};

function toItem(r: Record<string, string>): GeneralLogItem {
  return {
    id: r.id,
    사업명: r['사업명'] ?? '',
    대분류: r['대분류'] ?? '',
    중분류: r['중분류'] ?? '',
    세부항목: r['세부항목'] ?? '',
    정렬순서: Number(r['정렬순서'] || 0),
    목표건: r['목표건'] ?? '',
    목표명: r['목표명'] ?? '',
  };
}

export async function getGeneralLogItems(businessName: string): Promise<GeneralLogItem[]> {
  const all = await getKeyedList(GENERAL_LOG_ITEM_TABLE);
  return all
    .filter((r) => r['사업명'] === businessName)
    .map(toItem)
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

function payload(fields: Record<string, string>): Record<string, string> {
  if (!fields['사업명'] || !fields['세부항목']) {
    throw new Error('사업명과 세부항목은 필수입니다.');
  }
  return {
    사업명: fields['사업명'],
    대분류: fields['대분류'] ?? '',
    중분류: fields['중분류'] ?? '',
    세부항목: fields['세부항목'],
    정렬순서: fields['정렬순서'] ?? '0',
    목표건: fields['목표건'] ?? '',
    목표명: fields['목표명'] ?? '',
  };
}

export async function addGeneralLogItem(fields: Record<string, string>): Promise<void> {
  await addKeyedRecord(GENERAL_LOG_ITEM_TABLE, { id: randomUUID(), ...payload(fields) });
}

export async function updateGeneralLogItem(id: string, fields: Record<string, string>): Promise<void> {
  await updateKeyedRecord(GENERAL_LOG_ITEM_TABLE, { id }, { id, ...payload(fields) });
}

export async function deleteGeneralLogItem(id: string): Promise<void> {
  await deleteKeyedRecord(GENERAL_LOG_ITEM_TABLE, { id });
}
