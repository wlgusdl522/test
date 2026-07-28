import { getSetting, setSetting } from '@/lib/supabase/settings';

export const VEHICLE_LOG_APPROVAL_MODE_MANUAL = '수기결재';
export const VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC = '전자결재';

const KEYS = {
  ITEM_CHECK_REPORT_THRESHOLD: 'ITEM_CHECK_REPORT_THRESHOLD',
  ITEM_CHECK_ASSET_MANAGER_EMAIL: 'ITEM_CHECK_ASSET_MANAGER_EMAIL',
  ITEM_CHECK_ACCOUNTING_EMAIL: 'ITEM_CHECK_ACCOUNTING_EMAIL',
  ITEM_CHECK_REPORT_JANDI_WEBHOOK: 'ITEM_CHECK_REPORT_JANDI_WEBHOOK',
  VEHICLE_LOG_APPROVAL_MODE: 'VEHICLE_LOG_APPROVAL_MODE',
  VEHICLE_MANAGER_EMAIL: 'VEHICLE_MANAGER_EMAIL',
} as const;

export type SystemSettings = {
  itemCheckReportThreshold: number;
  itemCheckAssetManagerEmail: string;
  itemCheckAccountingEmail: string;
  itemCheckReportJandiWebhook: string;
  vehicleLogApprovalMode: string;
  vehicleManagerEmail: string;
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const [threshold, assetManager, accounting, jandi, approvalMode, vehicleManager] = await Promise.all([
    getSetting(KEYS.ITEM_CHECK_REPORT_THRESHOLD),
    getSetting(KEYS.ITEM_CHECK_ASSET_MANAGER_EMAIL),
    getSetting(KEYS.ITEM_CHECK_ACCOUNTING_EMAIL),
    getSetting(KEYS.ITEM_CHECK_REPORT_JANDI_WEBHOOK),
    getSetting(KEYS.VEHICLE_LOG_APPROVAL_MODE),
    getSetting(KEYS.VEHICLE_MANAGER_EMAIL),
  ]);
  return {
    itemCheckReportThreshold: Number(threshold) || 0,
    itemCheckAssetManagerEmail: assetManager,
    itemCheckAccountingEmail: accounting,
    itemCheckReportJandiWebhook: jandi,
    vehicleLogApprovalMode: approvalMode || VEHICLE_LOG_APPROVAL_MODE_MANUAL,
    vehicleManagerEmail: vehicleManager,
  };
}

export async function setSystemSettings(settings: SystemSettings): Promise<void> {
  if (![VEHICLE_LOG_APPROVAL_MODE_MANUAL, VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC].includes(settings.vehicleLogApprovalMode)) {
    throw new Error('차량운행일지 결재방식을 올바르게 선택해주세요.');
  }
  await Promise.all([
    setSetting(KEYS.ITEM_CHECK_REPORT_THRESHOLD, String(Number(settings.itemCheckReportThreshold) || 0)),
    setSetting(KEYS.ITEM_CHECK_ASSET_MANAGER_EMAIL, settings.itemCheckAssetManagerEmail.trim()),
    setSetting(KEYS.ITEM_CHECK_ACCOUNTING_EMAIL, settings.itemCheckAccountingEmail.trim()),
    setSetting(KEYS.ITEM_CHECK_REPORT_JANDI_WEBHOOK, settings.itemCheckReportJandiWebhook.trim()),
    setSetting(KEYS.VEHICLE_LOG_APPROVAL_MODE, settings.vehicleLogApprovalMode),
    setSetting(KEYS.VEHICLE_MANAGER_EMAIL, settings.vehicleManagerEmail.trim()),
  ]);
}
