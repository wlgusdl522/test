'use server';

import { revalidatePath } from 'next/cache';
import { addKeyedRecord, deleteKeyedRecord, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';

export async function addVehicleAction(formData: FormData) {
  const number = String(formData.get('number') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  if (!number) throw new Error('차량번호를 입력해주세요.');
  await addKeyedRecord(VEHICLE_LIST_TABLE, { 차량번호: number, 차종: type });
  revalidatePath('/settings/vehicles');
}

export async function updateVehicleAction(formData: FormData) {
  const oldNumber = String(formData.get('oldNumber') ?? '');
  const newNumber = String(formData.get('newNumber') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  if (!newNumber) throw new Error('차량번호를 입력해주세요.');
  await updateKeyedRecord(VEHICLE_LIST_TABLE, { 차량번호: oldNumber }, { 차량번호: newNumber, 차종: type });
  revalidatePath('/settings/vehicles');
}

export async function deleteVehicleAction(formData: FormData) {
  const number = String(formData.get('number') ?? '');
  await deleteKeyedRecord(VEHICLE_LIST_TABLE, { 차량번호: number });
  revalidatePath('/settings/vehicles');
}
