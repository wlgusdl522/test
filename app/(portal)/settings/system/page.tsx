import { getSystemSettings, VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC, VEHICLE_LOG_APPROVAL_MODE_MANUAL } from '@/lib/mutate/settings';
import { btn, h1, hint, input, label, pageFluid } from '@/lib/ui';
import { saveSystemSettingsAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function SystemSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>설정 &gt; 시스템 설정값</h1>
      <p className={hint}>기존 Apps Script의 스크립트 속성(PropertiesService) 6개 값을 이관한 화면입니다.</p>

      <form action={saveSystemSettingsAction} className="flex flex-col gap-3">
        <label className={label}>
          물품검수조서 결재 임계금액
          <input type="number" name="itemCheckReportThreshold" defaultValue={settings.itemCheckReportThreshold} className={input} />
        </label>
        <label className={label}>
          물품관리자 이메일
          <input name="itemCheckAssetManagerEmail" defaultValue={settings.itemCheckAssetManagerEmail} className={input} />
        </label>
        <label className={label}>
          회계담당자 이메일
          <input name="itemCheckAccountingEmail" defaultValue={settings.itemCheckAccountingEmail} className={input} />
        </label>
        <label className={label}>
          물품검수조서 JANDI 폴백 웹훅
          <input name="itemCheckReportJandiWebhook" defaultValue={settings.itemCheckReportJandiWebhook} className={input} />
        </label>
        <label className={label}>
          차량운행일지 결재방식
          <select name="vehicleLogApprovalMode" defaultValue={settings.vehicleLogApprovalMode} className={input}>
            <option value={VEHICLE_LOG_APPROVAL_MODE_MANUAL}>{VEHICLE_LOG_APPROVAL_MODE_MANUAL}</option>
            <option value={VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC}>{VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC}</option>
          </select>
        </label>
        <label className={label}>
          차량관리자 이메일
          <input name="vehicleManagerEmail" defaultValue={settings.vehicleManagerEmail} className={input} />
        </label>
        <label className={label}>
          카드사용대장 경과일 경고 기준(일)
          <input type="number" name="cardLedgerWarnDays" defaultValue={settings.cardLedgerWarnDays} className={input} />
        </label>
        <label className={label}>
          카드사용대장 경과일 위험 기준(일)
          <input type="number" name="cardLedgerDangerDays" defaultValue={settings.cardLedgerDangerDays} className={input} />
        </label>
        <div>
          <button type="submit" className={btn}>저장</button>
        </div>
      </form>
    </main>
  );
}
