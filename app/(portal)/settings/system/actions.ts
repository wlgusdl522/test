'use server';

import { revalidatePath } from 'next/cache';
import { getSystemSettings, setCertificateSealImageUrl, setSystemSettings } from '@/lib/mutate/settings';
import { uploadImageDataUrl, deleteDriveFileFromUrl } from '@/lib/drive/upload';
import { getCertificateRootFolderId } from '@/lib/drive/certificateFolder';

export async function saveSystemSettingsAction(formData: FormData) {
  // 기관 직인 이미지는 별도 파일 업로드 액션(saveCertificateSealAction)으로 관리되는 값이라
  // 이 텍스트 설정 폼 제출로 덮어쓰지 않도록 기존 값을 그대로 들고 간다.
  const current = await getSystemSettings();
  await setSystemSettings({
    itemCheckReportThreshold: Number(formData.get('itemCheckReportThreshold') ?? 0),
    itemCheckAssetManagerEmail: String(formData.get('itemCheckAssetManagerEmail') ?? ''),
    itemCheckAccountingEmail: String(formData.get('itemCheckAccountingEmail') ?? ''),
    itemCheckReportJandiWebhook: String(formData.get('itemCheckReportJandiWebhook') ?? ''),
    vehicleLogApprovalMode: String(formData.get('vehicleLogApprovalMode') ?? ''),
    vehicleManagerEmail: String(formData.get('vehicleManagerEmail') ?? ''),
    cardLedgerWarnDays: Number(formData.get('cardLedgerWarnDays') ?? 5),
    cardLedgerDangerDays: Number(formData.get('cardLedgerDangerDays') ?? 10),
    certificateApproverEmail: String(formData.get('certificateApproverEmail') ?? ''),
    certificateClerkEmail: String(formData.get('certificateClerkEmail') ?? ''),
    certificateSealImageUrl: current.certificateSealImageUrl,
    staffMeetingJandiWebhook: String(formData.get('staffMeetingJandiWebhook') ?? ''),
    staffMeetingInfoEditTeam: String(formData.get('staffMeetingInfoEditTeam') ?? ''),
    staffMeetingInfoEditEmails: String(formData.get('staffMeetingInfoEditEmails') ?? ''),
  });
  revalidatePath('/settings/system');
}

async function fileToDataUrl(file: File | null): Promise<string> {
  if (!file || file.size === 0) return '';
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString('base64')}`;
}

export async function saveCertificateSealAction(formData: FormData) {
  const dataUrl = await fileToDataUrl(formData.get('seal') as File | null);
  if (!dataUrl) return;
  const current = await getSystemSettings();
  if (current.certificateSealImageUrl) await deleteDriveFileFromUrl(current.certificateSealImageUrl);
  const folderId = await getCertificateRootFolderId();
  const url = await uploadImageDataUrl(dataUrl, '기관직인', folderId);
  await setCertificateSealImageUrl(url);
  revalidatePath('/settings/system');
}
