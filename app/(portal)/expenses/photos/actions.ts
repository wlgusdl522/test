'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { deleteItemCheckPhoto, saveItemCheckPhoto } from '@/lib/mutate/itemCheckPhoto';
import { ITEM_CHECK_PHOTO_SLOTS } from '@/lib/sheets/registry';
import { mineRedirectUrl } from '@/lib/expensesNav';

async function fileToDataUrl(file: File | null): Promise<string> {
  if (!file || file.size === 0) return '';
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString('base64')}`;
}

export async function saveItemCheckPhotoAction(formData: FormData): Promise<void> {
  const existingId = String(formData.get('id') ?? '') || undefined;
  const ledgerId = String(formData.get('ledgerId') ?? '');
  const payload: Record<string, string> = {
    카드사용대장ID: ledgerId,
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
  redirect(mineRedirectUrl(formData, { focus: ledgerId }));
}

export async function deleteItemCheckPhotoAction(formData: FormData) {
  await deleteItemCheckPhoto(String(formData.get('id') ?? ''));
  revalidatePath('/expenses/mine');
}
