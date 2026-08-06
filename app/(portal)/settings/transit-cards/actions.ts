'use server';

import { revalidatePath } from 'next/cache';
import { addTransitCard, deleteTransitCard, updateTransitCard } from '@/lib/mutate/transitCard';

export async function addTransitCardAction(formData: FormData) {
  await addTransitCard({
    카드ID: String(formData.get('cardId') ?? ''),
    카드명: String(formData.get('cardName') ?? ''),
    초기잔액: String(formData.get('initBalance') ?? ''),
  });
  revalidatePath('/settings/transit-cards');
}

export async function updateTransitCardAction(formData: FormData) {
  const oldCardId = String(formData.get('oldCardId') ?? '');
  await updateTransitCard(oldCardId, {
    카드ID: String(formData.get('cardId') ?? ''),
    카드명: String(formData.get('cardName') ?? ''),
    초기잔액: String(formData.get('initBalance') ?? ''),
  });
  revalidatePath('/settings/transit-cards');
}

export async function deleteTransitCardAction(formData: FormData) {
  await deleteTransitCard(String(formData.get('cardId') ?? ''));
  revalidatePath('/settings/transit-cards');
}
