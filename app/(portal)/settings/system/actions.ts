'use server';

import { revalidatePath } from 'next/cache';
import { setSystemSettings } from '@/lib/mutate/settings';

export async function saveSystemSettingsAction(formData: FormData) {
  await setSystemSettings({
    itemCheckReportThreshold: Number(formData.get('itemCheckReportThreshold') ?? 0),
    itemCheckAssetManagerEmail: String(formData.get('itemCheckAssetManagerEmail') ?? ''),
    itemCheckAccountingEmail: String(formData.get('itemCheckAccountingEmail') ?? ''),
    itemCheckReportJandiWebhook: String(formData.get('itemCheckReportJandiWebhook') ?? ''),
    vehicleLogApprovalMode: String(formData.get('vehicleLogApprovalMode') ?? ''),
    vehicleManagerEmail: String(formData.get('vehicleManagerEmail') ?? ''),
  });
  revalidatePath('/settings/system');
}
