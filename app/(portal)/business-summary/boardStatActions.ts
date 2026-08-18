'use server';

import { revalidatePath } from 'next/cache';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';
import {
  addModuleItem, deleteModuleItem, moveModuleItem, setModuleValue, type BoardStatModule,
} from '@/lib/mutate/boardStat';
import { saveRosterForItem, type RosterRowInput } from '@/lib/mutate/boardRoster';

function revalidateAll() {
  revalidatePath('/business-summary/accounting');
  revalidatePath('/business-summary/volunteers');
  revalidatePath('/business-summary/donations');
}

export async function addBoardStatItemAction(formData: FormData): Promise<void> {
  const 모듈 = String(formData.get('모듈') ?? '') as BoardStatModule;
  await addModuleItem(모듈, String(formData.get('항목명') ?? ''));
  revalidateAll();
}

export async function moveBoardStatItemAction(formData: FormData): Promise<void> {
  const 모듈 = String(formData.get('모듈') ?? '') as BoardStatModule;
  const id = String(formData.get('id') ?? '');
  const direction = String(formData.get('direction') ?? 'up') as 'up' | 'down';
  await moveModuleItem(모듈, id, direction);
  revalidateAll();
}

export async function deleteBoardStatItemAction(formData: FormData): Promise<void> {
  await deleteModuleItem(String(formData.get('id') ?? ''));
  revalidateAll();
}

export async function submitBoardStatValuesAction(
  시설: string,
  년월: string,
  entries: { 항목ID: string; 값: number }[]
): Promise<void> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  const name = me?.성명 ?? '';
  for (const e of entries) {
    await setModuleValue(e.항목ID, 시설, 년월, e.값, viewerEmail, name);
  }
  revalidateAll();
}

export async function saveRosterAction(항목ID: string, ym: string, rows: RosterRowInput[]): Promise<void> {
  await saveRosterForItem(항목ID, ym, rows);
  revalidateAll();
}
