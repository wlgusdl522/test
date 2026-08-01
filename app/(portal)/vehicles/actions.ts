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

type Req = Record<string, string>;

async function payloadFromForm(formData: FormData): Promise<Req> {
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

// 화면에 즉시 반영되도록, revalidatePath/router.refresh()가 도착하기를 기다리는 대신
// 방금 커밋된 전체 목록을 매 mutation의 반환값으로 클라이언트에 바로 돌려준다.
export async function addVehicleRequestAction(
  formData: FormData
): Promise<{ date: string; count: number; requests: Req[] }> {
  const payload = await payloadFromForm(formData);
  const isRecurring = formData.get('recurring') === 'on';

  let result: { date: string; count: number; requests: Req[] };
  if (isRecurring) {
    const weekdays = formData.getAll('weekday').map(Number);
    const untilDate = String(formData.get('untilDate') ?? '');
    const { count, firstDate, requests } = await addVehicleRequestsRecurring(payload, weekdays, untilDate);
    result = { date: firstDate, count, requests };
  } else {
    const requests = await addVehicleRequest(payload);
    result = { date: payload['사용일자'], count: 1, requests };
  }
  revalidatePath('/vehicles');
  revalidatePath('/vehicles/requests');
  return result;
}

export async function updateVehicleRequestAction(
  formData: FormData
): Promise<{ date: string; count: number; requests: Req[] }> {
  const id = String(formData.get('id') ?? '');
  const payload = await payloadFromForm(formData);
  const requests = await updateVehicleRequest(id, payload);
  revalidatePath('/vehicles');
  revalidatePath('/vehicles/requests');
  return { date: payload['사용일자'], count: 1, requests };
}

export async function deleteVehicleRequestAction(formData: FormData): Promise<{ requests: Req[] }> {
  const id = String(formData.get('id') ?? '');
  const requests = await deleteVehicleRequest(id);
  revalidatePath('/vehicles');
  revalidatePath('/vehicles/requests');
  return { requests };
}

export async function deleteVehicleRequestSeriesAction(formData: FormData): Promise<{ requests: Req[] }> {
  const id = String(formData.get('id') ?? '');
  const { requests } = await deleteVehicleRequestSeriesFrom(id);
  revalidatePath('/vehicles');
  revalidatePath('/vehicles/requests');
  return { requests };
}

// 서버 컴포넌트의 <form action={...}>는 void 반환만 허용해서, 최신 목록을 돌려주는 위 두
// 함수를 그 자리에 바로 못 쓴다 — 신청내역 페이지의 삭제 버튼 전용으로 값만 버리는 래퍼.
export async function deleteVehicleRequestFormAction(formData: FormData): Promise<void> {
  await deleteVehicleRequestAction(formData);
}
export async function deleteVehicleRequestSeriesFormAction(formData: FormData): Promise<void> {
  await deleteVehicleRequestSeriesAction(formData);
}
