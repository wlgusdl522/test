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
    supportsAllDrives: true, // 공유 드라이브 폴더(예: 당직 서명 폴더)에 올릴 때는 이 플래그가 없으면 "File not found"로 실패한다
  });
  const fileId = res.data.id;
  if (!fileId) throw new Error('파일 업로드에 실패했습니다.');

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  return `https://drive.google.com/file/d/${fileId}/view`;
}

export async function deleteDriveFileFromUrl(url: string): Promise<void> {
  const match = String(url).match(/[-\w]{25,}/);
  if (!match) return;
  try {
    await getDriveClient().files.update({ fileId: match[0], requestBody: { trashed: true }, supportsAllDrives: true });
  } catch {
    // 이미 지워졌거나 접근 불가 - 무시 (원본 Code.js의 deleteItemCheckPhotoFile_와 동일한 관용구)
  }
}
