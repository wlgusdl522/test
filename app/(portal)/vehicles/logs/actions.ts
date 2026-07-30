'use server';

import { revalidatePath } from 'next/cache';
import { actOnVehicleLog, addVehicleLog, deleteVehicleLog, updateVehicleLog } from '@/lib/mutate/vehicleLog';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

async function payloadFromForm(formData: FormData): Promise<Record<string, string>> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  return {
    신청ID: String(formData.get('requestId') ?? ''),
    차량번호: String(formData.get('vehicleNo') ?? ''),
    운전자이메일: viewerEmail,
    운전자명: me?.성명 ?? '',
    소속팀: me?.소속팀 ?? '',
    운행일자: String(formData.get('date') ?? ''),
    출발시간: String(formData.get('startTime') ?? ''),
    도착시간: String(formData.get('endTime') ?? ''),
    목적: String(formData.get('purpose') ?? ''),
    목적지: String(formData.get('destination') ?? ''),
    출발계기판: String(formData.get('odoStart') ?? ''),
    도착계기판: String(formData.get('odoEnd') ?? ''),
    주행거리: String(
      Number(formData.get('odoEnd') ?? 0) > Number(formData.get('odoStart') ?? 0)
        ? Number(formData.get('odoEnd')) - Number(formData.get('odoStart'))
        : ''
    ),
    비고: String(formData.get('note') ?? ''),
    주유필요: formData.get('needsFuel') === 'on' ? 'Y' : 'N',
    주유금액: String(formData.get('fuelAmount') ?? ''),
    주유단가: String(formData.get('fuelUnitPrice') ?? ''),
    주유량: String(formData.get('fuelLiters') ?? ''),
  };
}

export async function addVehicleLogAction(formData: FormData) {
  await addVehicleLog(await payloadFromForm(formData));
  revalidatePath('/vehicles/logs');
}

export async function updateVehicleLogAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await updateVehicleLog(id, await payloadFromForm(formData));
  revalidatePath('/vehicles/logs');
}

export async function deleteVehicleLogAction(formData: FormData) {
  await deleteVehicleLog(String(formData.get('id') ?? ''));
  revalidatePath('/vehicles/logs');
}

export async function actOnVehicleLogAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') as '승인' | '반려';
  const comment = String(formData.get('comment') ?? '');
  await actOnVehicleLog(id, action, comment);
  revalidatePath('/vehicles/logs');
}
