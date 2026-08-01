'use server';

import { revalidatePath } from 'next/cache';
import {
  addVehicleRequest,
  addVehicleRequestsRecurring,
  deleteVehicleRequest,
  deleteVehicleRequestSeriesFrom,
  updateVehicleRequest,
} from '@/lib/mutate/vehicleRequest';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';

async function payloadFromForm(formData: FormData): Promise<Record<string, string>> {
  const viewerEmail = await requireViewerEmail();
  const me = await getViewerStaffRecord();
  return {
    차량번호: String(formData.get('vehicleNo') ?? ''),
    신청자이메일: viewerEmail,
    신청자명: me?.성명 ?? '',
    소속팀: me?.소속팀 ?? '',
    사용일자: String(formData.get('date') ?? ''),
    출발시간: String(formData.get('startTime') ?? ''),
    복귀시간: String(formData.get('endTime') ?? ''),
    목적: String(formData.get('purpose') ?? ''),
    목적지: String(formData.get('destination') ?? ''),
    동승자: String(formData.get('companions') ?? ''),
    비고: String(formData.get('note') ?? ''),
  };
}

export async function addVehicleRequestAction(formData: FormData) {
  const payload = await payloadFromForm(formData);
  const isRecurring = formData.get('recurring') === 'on';

  if (isRecurring) {
    const weekdays = formData.getAll('weekday').map(Number);
    const untilDate = String(formData.get('untilDate') ?? '');
    await addVehicleRequestsRecurring(payload, weekdays, untilDate);
  } else {
    await addVehicleRequest(payload);
  }
  revalidatePath('/vehicles');
  revalidatePath('/vehicles/requests');
}

export async function updateVehicleRequestAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const payload = await payloadFromForm(formData);
  await updateVehicleRequest(id, payload);
  revalidatePath('/vehicles');
  revalidatePath('/vehicles/requests');
}

export async function deleteVehicleRequestAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await deleteVehicleRequest(id);
  revalidatePath('/vehicles');
  revalidatePath('/vehicles/requests');
}

export async function deleteVehicleRequestSeriesAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await deleteVehicleRequestSeriesFrom(id);
  revalidatePath('/vehicles');
  revalidatePath('/vehicles/requests');
}
