'use server';

import { revalidatePath } from 'next/cache';
import { addVehicleMaintenance, deleteVehicleMaintenance, updateVehicleMaintenance } from '@/lib/mutate/vehicleMaintenance';

function payloadFromForm(formData: FormData): Record<string, string> {
  return {
    차량번호: String(formData.get('vehicleNo') ?? ''),
    정비일자: String(formData.get('date') ?? ''),
    정비내용: String(formData.get('content') ?? ''),
    주행거리: String(formData.get('mileage') ?? ''),
    지출액: String(formData.get('cost') ?? ''),
    비고: String(formData.get('note') ?? ''),
  };
}

export async function addVehicleMaintenanceAction(formData: FormData) {
  await addVehicleMaintenance(payloadFromForm(formData));
  revalidatePath('/vehicles/maintenance');
}

export async function updateVehicleMaintenanceAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await updateVehicleMaintenance(id, payloadFromForm(formData));
  revalidatePath('/vehicles/maintenance');
}

export async function deleteVehicleMaintenanceAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  await deleteVehicleMaintenance(id);
  revalidatePath('/vehicles/maintenance');
}
