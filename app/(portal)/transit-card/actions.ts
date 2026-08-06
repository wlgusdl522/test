'use server';

import { revalidatePath } from 'next/cache';
import { addTransitLedgerRecord, deleteTransitLedgerRecord, updateTransitLedgerRecord } from '@/lib/mutate/transitCard';

function payloadFromForm(formData: FormData): Record<string, string> {
  return {
    교통카드: String(formData.get('cardId') ?? ''),
    사용일자: String(formData.get('date') ?? ''),
    목적: String(formData.get('purpose') ?? ''),
    출발지: String(formData.get('from') ?? ''),
    도착지: String(formData.get('to') ?? ''),
    교통수단: String(formData.get('transport') ?? ''),
    충전액: String(formData.get('charge') ?? ''),
    사용액: String(formData.get('use') ?? ''),
  };
}

export async function addTransitLedgerAction(formData: FormData) {
  await addTransitLedgerRecord(payloadFromForm(formData));
  revalidatePath('/transit-card');
}

export async function updateTransitLedgerAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await updateTransitLedgerRecord(id, payloadFromForm(formData));
  revalidatePath('/transit-card');
}

export async function deleteTransitLedgerAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await deleteTransitLedgerRecord(id);
  revalidatePath('/transit-card');
}
