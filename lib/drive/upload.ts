import { Readable } from 'stream';
import { getDriveClient } from '@/lib/sheets/client';

export async function uploadImageDataUrl(dataUrl: string, filenamePrefix: string, folderId: string): Promise<string> {
  const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('올바른 이미지 데이터가 아닙니다.');
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = contentType.split('/')[1].replace('jpeg', 'jpg');

  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: `${filenamePrefix}.${ext}`, parents: [folderId] },
    media: { mimeType: contentType, body: Readable.from(buffer) },
    fields: 'id',
  });
  const fileId = res.data.id;
  if (!fileId) throw new Error('파일 업로드에 실패했습니다.');

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return `https://drive.google.com/file/d/${fileId}/view`;
}

export async function deleteDriveFileFromUrl(url: string): Promise<void> {
  const match = String(url).match(/[-\w]{25,}/);
  if (!match) return;
  try {
    await getDriveClient().files.update({ fileId: match[0], requestBody: { trashed: true } });
  } catch {
    // 이미 지워졌거나 접근 불가 - 무시 (원본 Code.js의 deleteItemCheckPhotoFile_와 동일한 관용구)
  }
}
