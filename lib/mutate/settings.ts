import { getSetting, setSetting } from '@/lib/supabase/settings';

export const VEHICLE_LOG_APPROVAL_MODE_MANUAL = '수기결재';
export const VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC = '전자결재';

const KEYS = {
  ITEM_CHECK_REPORT_THRESHOLD: 'ITEM_CHECK_REPORT_THRESHOLD',
  ITEM_CHECK_ASSET_MANAGER_EMAIL: 'ITEM_CHECK_ASSET_MANAGER_EMAIL',
  ITEM_CHECK_GENERAL_AFFAIRS_MANAGER_EMAIL: 'ITEM_CHECK_GENERAL_AFFAIRS_MANAGER_EMAIL',
  ITEM_CHECK_ACCOUNTING_EMAIL: 'ITEM_CHECK_ACCOUNTING_EMAIL',
  ITEM_CHECK_REPORT_JANDI_WEBHOOK: 'ITEM_CHECK_REPORT_JANDI_WEBHOOK',
  VEHICLE_LOG_APPROVAL_MODE: 'VEHICLE_LOG_APPROVAL_MODE',
  VEHICLE_MANAGER_EMAIL: 'VEHICLE_MANAGER_EMAIL',
  CARD_LEDGER_WARN_DAYS: 'CARD_LEDGER_WARN_DAYS',
  CARD_LEDGER_DANGER_DAYS: 'CARD_LEDGER_DANGER_DAYS',
  CERTIFICATE_APPROVER_EMAIL: 'CERTIFICATE_APPROVER_EMAIL',
  CERTIFICATE_CLERK_EMAIL: 'CERTIFICATE_CLERK_EMAIL',
  CERTIFICATE_SEAL_IMAGE_URL: 'CERTIFICATE_SEAL_IMAGE_URL',
  STAFF_MEETING_JANDI_WEBHOOK: 'STAFF_MEETING_JANDI_WEBHOOK',
} as const;

export type SystemSettings = {
  itemCheckReportThreshold: number;
  itemCheckAssetManagerEmail: string;
  itemCheckGeneralAffairsManagerEmail: string;
  itemCheckAccountingEmail: string;
  itemCheckReportJandiWebhook: string;
  vehicleLogApprovalMode: string;
  vehicleManagerEmail: string;
  cardLedgerWarnDays: number;
  cardLedgerDangerDays: number;
  certificateApproverEmail: string;
  certificateClerkEmail: string;
  certificateSealImageUrl: string;
  staffMeetingJandiWebhook: string;
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const [
    threshold,
    assetManager,
    generalAffairsManager,
    accounting,
    jandi,
    approvalMode,
    vehicleManager,
    warnDays,
    dangerDays,
    certificateApprover,
    certificateClerk,
    certificateSealImageUrl,
    staffMeetingJandiWebhook,
  ] = await Promise.all([
    getSetting(KEYS.ITEM_CHECK_REPORT_THRESHOLD),
    getSetting(KEYS.ITEM_CHECK_ASSET_MANAGER_EMAIL),
    getSetting(KEYS.ITEM_CHECK_GENERAL_AFFAIRS_MANAGER_EMAIL),
    getSetting(KEYS.ITEM_CHECK_ACCOUNTING_EMAIL),
    getSetting(KEYS.ITEM_CHECK_REPORT_JANDI_WEBHOOK),
    getSetting(KEYS.VEHICLE_LOG_APPROVAL_MODE),
    getSetting(KEYS.VEHICLE_MANAGER_EMAIL),
    getSetting(KEYS.CARD_LEDGER_WARN_DAYS),
    getSetting(KEYS.CARD_LEDGER_DANGER_DAYS),
    getSetting(KEYS.CERTIFICATE_APPROVER_EMAIL),
    getSetting(KEYS.CERTIFICATE_CLERK_EMAIL),
    getSetting(KEYS.CERTIFICATE_SEAL_IMAGE_URL),
    getSetting(KEYS.STAFF_MEETING_JANDI_WEBHOOK),
  ]);
  return {
    itemCheckReportThreshold: Number(threshold) || 0,
    itemCheckAssetManagerEmail: assetManager,
    itemCheckGeneralAffairsManagerEmail: generalAffairsManager,
    itemCheckAccountingEmail: accounting,
    itemCheckReportJandiWebhook: jandi,
    vehicleLogApprovalMode: approvalMode || VEHICLE_LOG_APPROVAL_MODE_MANUAL,
    vehicleManagerEmail: vehicleManager,
    cardLedgerWarnDays: Number(warnDays) || 5,
    cardLedgerDangerDays: Number(dangerDays) || 10,
    certificateApproverEmail: certificateApprover,
    certificateClerkEmail: certificateClerk,
    certificateSealImageUrl,
    staffMeetingJandiWebhook,
  };
}

export async function setSystemSettings(settings: SystemSettings): Promise<void> {
  if (![VEHICLE_LOG_APPROVAL_MODE_MANUAL, VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC].includes(settings.vehicleLogApprovalMode)) {
    throw new Error('차량운행일지 결재방식을 올바르게 선택해주세요.');
  }
  await Promise.all([
    setSetting(KEYS.ITEM_CHECK_REPORT_THRESHOLD, String(Number(settings.itemCheckReportThreshold) || 0)),
    setSetting(KEYS.ITEM_CHECK_ASSET_MANAGER_EMAIL, settings.itemCheckAssetManagerEmail.trim()),
    setSetting(KEYS.ITEM_CHECK_GENERAL_AFFAIRS_MANAGER_EMAIL, settings.itemCheckGeneralAffairsManagerEmail.trim()),
    setSetting(KEYS.ITEM_CHECK_ACCOUNTING_EMAIL, settings.itemCheckAccountingEmail.trim()),
    setSetting(KEYS.ITEM_CHECK_REPORT_JANDI_WEBHOOK, settings.itemCheckReportJandiWebhook.trim()),
    setSetting(KEYS.VEHICLE_LOG_APPROVAL_MODE, settings.vehicleLogApprovalMode),
    setSetting(KEYS.VEHICLE_MANAGER_EMAIL, settings.vehicleManagerEmail.trim()),
    setSetting(KEYS.CARD_LEDGER_WARN_DAYS, String(Number(settings.cardLedgerWarnDays) || 5)),
    setSetting(KEYS.CARD_LEDGER_DANGER_DAYS, String(Number(settings.cardLedgerDangerDays) || 10)),
    setSetting(KEYS.CERTIFICATE_APPROVER_EMAIL, settings.certificateApproverEmail.trim()),
    setSetting(KEYS.CERTIFICATE_CLERK_EMAIL, settings.certificateClerkEmail.trim()),
    setSetting(KEYS.STAFF_MEETING_JANDI_WEBHOOK, settings.staffMeetingJandiWebhook.trim()),
  ]);
}

// 기관 직인 이미지는 파일 업로드라 위 텍스트 설정 폼과 별도 액션으로 저장한다(saveCertificateSealAction).
export async function setCertificateSealImageUrl(url: string): Promise<void> {
  await setSetting(KEYS.CERTIFICATE_SEAL_IMAGE_URL, url);
}
