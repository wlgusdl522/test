'use server';

import { revalidatePath } from 'next/cache';
import { printCardLedgerRecord, printCardLedgerRecords, rejectCardLedgerRecord } from '@/lib/mutate/cardLedger';
import { requireIsAccountingViewer } from '@/lib/auth-helpers';

export async function printCardLedgerAction(formData: FormData) {
  await requireIsAccountingViewer();
  await printCardLedgerRecord(String(formData.get('id') ?? ''));
  revalidatePath('/expenses/review');
}

export async function printCardLedgerBatchAction(formData: FormData) {
  await requireIsAccountingViewer();
  const ids = formData.getAll('ids').map(String).filter(Boolean);
  await printCardLedgerRecords(ids);
  revalidatePath('/expenses/review');
}

export async function rejectCardLedgerAction(formData: FormData) {
  await requireIsAccountingViewer();
  await rejectCardLedgerRecord(String(formData.get('id') ?? ''), String(formData.get('reason') ?? ''));
  revalidatePath('/expenses/review');
}
