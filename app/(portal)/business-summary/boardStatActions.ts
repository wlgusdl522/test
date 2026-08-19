'use server';

import { revalidatePath } from 'next/cache';
import { requireViewerEmail, getViewerStaffRecord } from '@/lib/auth-helpers';
import {
  addModuleItem, deleteModuleItem, moveModuleItem, setModuleValues, type BoardStatModule,
} from '@/lib/mutate/boardStat';
import { saveRosterForYm, type RosterRowInput } from '@/lib/mutate/boardRoster';

function revalidateAll() {
  revalidatePath('/business-summary/accounting');
  revalidatePath('/business-summary/volunteers');
  revalidatePath('/business-summary/donations');
  revalidatePath('/business-summary/headcount');
  revalidatePath('/business-summary/headcount/view');
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
  await setModuleValues(
    entries.map((e) => ({ 항목ID: e.항목ID, 시설, 년월, 값: e.값 })),
    viewerEmail,
    name
  );
  revalidateAll();
}

export async function saveRosterAction(항목IDs: string[], ym: string, rows: RosterRowInput[]): Promise<void> {
  await saveRosterForYm(항목IDs, ym, rows);
  revalidateAll();
}
