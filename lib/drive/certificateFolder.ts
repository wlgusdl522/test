import { Readable } from 'stream';
import { getDriveClient } from '@/lib/sheets/client';
import { CERTIFICATE_ARCHIVE_FOLDER_ID } from '@/lib/sheets/sheetIds';

// 발급된 PDF는 CERTIFICATE_ARCHIVE_FOLDER_ID("증명서.상장 발급내역 원본") 아래
// 연도별 하위 폴더에 저장한다. 연도 폴더가 없으면 그때 만든다.
async function findOrCreateFolder(name: string, parentId: string | undefined): Promise<string> {
  const drive = getDriveClient();
  const parentClause = parentId ? ` and '${parentId}' in parents` : '';
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false${parentClause}`;
  const found = await drive.files.list({
    q,
    fields: 'files(id)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existingId = found.data.files?.[0]?.id;
  if (existingId) return existingId;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  const id = created.data.id;
  if (!id) throw new Error(`Drive 폴더 생성 실패: ${name}`);
  return id;
}

export async function getCertificateRootFolderId(): Promise<string> {
  return CERTIFICATE_ARCHIVE_FOLDER_ID;
}

export async function getCertificateYearFolderId(year: number): Promise<string> {
  const root = await getCertificateRootFolderId();
  return findOrCreateFolder(String(year), root);
}

export async function uploadCertificatePdf(buffer: Buffer, filename: string, year: number): Promise<string> {
  const folderId = await getCertificateYearFolderId(year);
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: 'application/pdf', body: Readable.from(buffer) },
    fields: 'id',
    supportsAllDrives: true,
  });
  const fileId = res.data.id;
  if (!fileId) throw new Error('증명서 PDF 업로드에 실패했습니다.');

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  return `https://drive.google.com/file/d/${fileId}/view`;
}
