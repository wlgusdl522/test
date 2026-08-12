import { Readable } from 'stream';
import { getDriveClient } from '@/lib/sheets/client';
import { STAFF_STAMP_FOLDER_ID } from '@/lib/sheets/sheetIds';

const ROOT_FOLDER_NAME = '증명서 발급함';

// 기존 업로드 폴더(개인 도장)와 같은 공유 드라이브 부모 아래에 "증명서 발급함" 루트를 두고,
// 그 밑에 연도별 하위 폴더를 둔다. 이미 있으면 그대로 재사용하고, 없으면 그때 만든다.
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

let rootParentId: string | null = null;
async function getSharedDriveParentId(): Promise<string | undefined> {
  if (rootParentId) return rootParentId;
  const res = await getDriveClient().files.get({
    fileId: STAFF_STAMP_FOLDER_ID,
    fields: 'parents',
    supportsAllDrives: true,
  });
  rootParentId = res.data.parents?.[0] ?? null;
  return rootParentId ?? undefined;
}

export async function getCertificateRootFolderId(): Promise<string> {
  const parent = await getSharedDriveParentId();
  return findOrCreateFolder(ROOT_FOLDER_NAME, parent);
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
