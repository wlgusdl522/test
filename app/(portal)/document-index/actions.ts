'use server';

import { revalidatePath } from 'next/cache';
import { addDocumentIndexEntry, deleteDocumentIndexEntry, startNewVolume } from '@/lib/mutate/documentIndex';

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '');
}

export async function addDocumentIndexEntryAction(formData: FormData) {
  await addDocumentIndexEntry({
    팀명: str(formData, '팀명'),
    연도: str(formData, '연도'),
    구분: str(formData, '구분') === '스탬프결재' ? '스탬프결재' : '일반문서',
    제목: str(formData, '제목'),
    월일: str(formData, '월일'),
    수신: str(formData, '수신'),
    발신: str(formData, '발신'),
  });
  revalidatePath('/document-index');
}

export async function deleteDocumentIndexEntryAction(formData: FormData) {
  await deleteDocumentIndexEntry(str(formData, 'id'));
  revalidatePath('/document-index');
}

export async function startNewVolumeAction(formData: FormData) {
  await startNewVolume(str(formData, '팀명'), str(formData, '연도'));
  revalidatePath('/document-index');
}
