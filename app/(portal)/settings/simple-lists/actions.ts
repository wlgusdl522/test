'use server';

import { revalidatePath } from 'next/cache';
import { addSimpleListItem, deleteSimpleListItem, moveSimpleListItem } from '@/lib/mutate/simpleList';

export async function addItemAction(formData: FormData) {
  const listName = String(formData.get('listName') ?? '');
  await addSimpleListItem(listName, String(formData.get('value') ?? ''));
  revalidatePath('/settings/simple-lists');
}

export async function deleteItemAction(formData: FormData) {
  const listName = String(formData.get('listName') ?? '');
  await deleteSimpleListItem(listName, String(formData.get('value') ?? ''));
  revalidatePath('/settings/simple-lists');
}

export async function moveItemAction(formData: FormData) {
  const listName = String(formData.get('listName') ?? '');
  const direction = String(formData.get('direction') ?? 'up') as 'up' | 'down';
  await moveSimpleListItem(listName, String(formData.get('value') ?? ''), direction);
  revalidatePath('/settings/simple-lists');
}
