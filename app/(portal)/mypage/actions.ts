'use server';

import { revalidatePath } from 'next/cache';
import { saveMyJandiWebhook, saveMyStamp } from '@/lib/mutate/staff';
import { requireViewerEmail } from '@/lib/auth-helpers';

async function fileToDataUrl(file: File | null): Promise<string> {
  if (!file || file.size === 0) return '';
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString('base64')}`;
}

export async function saveMyStampAction(formData: FormData) {
  const viewerEmail = await requireViewerEmail();
  const dataUrl = await fileToDataUrl(formData.get('stamp') as File | null);
  if (!dataUrl) return;
  await saveMyStamp(viewerEmail, dataUrl);
  revalidatePath('/mypage');
}

export async function saveMyJandiWebhookAction(formData: FormData) {
  const viewerEmail = await requireViewerEmail();
  const url = String(formData.get('webhookUrl') ?? '');
  await saveMyJandiWebhook(viewerEmail, url);
  revalidatePath('/mypage');
}
