'use server';

import { revalidatePath } from 'next/cache';
import { deleteItemCheckPhoto, saveItemCheckPhoto, setItemCheckPhotoPrinted } from '@/lib/mutate/itemCheckPhoto';
import { ITEM_CHECK_PHOTO_SLOTS } from '@/lib/sheets/registry';
import { requireIsAccountingViewer } from '@/lib/auth-helpers';

async function fileToDataUrl(file: File | null): Promise<string> {
  if (!file || file.size === 0) return '';
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString('base64')}`;
}

export async function saveItemCheckPhotoAction(formData: FormData) {
  const existingId = String(formData.get('id') ?? '') || undefined;
  const payload: Record<string, string> = {
    카드사용대장ID: String(formData.get('ledgerId') ?? ''),
    사업명: String(formData.get('business') ?? ''),
    프로그램명: String(formData.get('program') ?? ''),
    지출일자: String(formData.get('date') ?? ''),
    품명: String(formData.get('itemName') ?? ''),
    금액: String(formData.get('amount') ?? ''),
  };
  for (const slot of ITEM_CHECK_PHOTO_SLOTS) {
    payload[slot] = await fileToDataUrl(formData.get(slot) as File | null);
  }
  await saveItemCheckPhoto(payload, existingId);
  revalidatePath('/expenses/photos');
}

export async function deleteItemCheckPhotoAction(formData: FormData) {
  await deleteItemCheckPhoto(String(formData.get('id') ?? ''));
  revalidatePath('/expenses/photos');
}

export async function setItemCheckPhotoPrintedAction(formData: FormData) {
  await requireIsAccountingViewer();
  const id = String(formData.get('id') ?? '');
  const printed = formData.get('printed') === 'true';
  await setItemCheckPhotoPrinted(id, printed);
  revalidatePath('/expenses/photos');
}
