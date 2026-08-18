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

  await grantPublicReadIfPossible(fileId);

  return `https://drive.google.com/file/d/${fileId}/view`;
}

// 업로드 폴더가 속한 공유 드라이브에 "팀원에게만 공유 가능" 정책이 걸리면 anyone 권한 부여가
// 400 teamDriveTeamMembersOnlyRestriction으로 항상 실패한다(관리자가 정책을 바꾸면 다시 될 수도
// 있음). 파일 자체는 이미 업로드된 뒤라, 권한 부여 실패 때문에 저장 자체가 막히면 안 된다
// (예전엔 여기서 throw해서 당직근무일지 서명 저장이 통째로 실패했었다) — 실패하면 경고만 남긴다.
async function grantPublicReadIfPossible(fileId: string): Promise<void> {
  try {
    await getDriveClient().permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
  } catch (error) {
    console.warn('[Drive 공개 권한 부여 실패 - 공유 드라이브 정책 때문일 수 있음]', (error as Error).message);
  }
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

// 업로드해둔 이미지를 다시 data URI로 읽어온다 — PDF에 직인처럼 임베드할 때, 공개된 "view" URL은
// react-pdf가 직접 못 읽으므로 서비스계정으로 원본 바이트를 받아와 base64로 바꿔서 넘긴다.
export async function getDriveImageAsDataUrl(url: string): Promise<string | null> {
  const match = String(url).match(/[-\w]{25,}/);
  if (!match) return null;
  try {
    const drive = getDriveClient();
    const meta = await drive.files.get({ fileId: match[0], fields: 'mimeType', supportsAllDrives: true });
    const mimeType = meta.data.mimeType || 'image/png';
    const res = await drive.files.get(
      { fileId: match[0], alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(res.data as ArrayBuffer);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('[Drive 이미지 다운로드 실패]', error);
    return null;
  }
}
