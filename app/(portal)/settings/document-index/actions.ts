'use server';

import { revalidatePath } from 'next/cache';
import { setDocumentIndexPrefix } from '@/lib/mutate/documentIndex';

export async function setDocumentIndexPrefixAction(formData: FormData) {
  const 팀명 = String(formData.get('팀명') ?? '');
  const 접두사 = String(formData.get('접두사') ?? '');
  await setDocumentIndexPrefix(팀명, 접두사);
  revalidatePath('/settings/document-index');
}
