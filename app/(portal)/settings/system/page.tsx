import { getSystemSettings, VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC, VEHICLE_LOG_APPROVAL_MODE_MANUAL } from '@/lib/mutate/settings';
import { saveSystemSettingsAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function SystemSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <h1>설정 &gt; 시스템 설정값</h1>
      <p style={{ color: '#666', fontSize: 13 }}>
        기존 Apps Script의 스크립트 속성(PropertiesService) 6개 값을 이관한 화면입니다.
      </p>

      <form action={saveSystemSettingsAction} style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0' }}>
        <label>
          물품검수조서 결재 임계금액
          <input
            type="number"
            name="itemCheckReportThreshold"
            defaultValue={settings.itemCheckReportThreshold}
            style={{ width: '100%', padding: 6 }}
          />
        </label>
        <label>
          물품관리자 이메일
          <input name="itemCheckAssetManagerEmail" defaultValue={settings.itemCheckAssetManagerEmail} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          회계담당자 이메일
          <input name="itemCheckAccountingEmail" defaultValue={settings.itemCheckAccountingEmail} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          물품검수조서 JANDI 폴백 웹훅
          <input name="itemCheckReportJandiWebhook" defaultValue={settings.itemCheckReportJandiWebhook} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          차량운행일지 결재방식
          <select name="vehicleLogApprovalMode" defaultValue={settings.vehicleLogApprovalMode} style={{ width: '100%', padding: 6 }}>
            <option value={VEHICLE_LOG_APPROVAL_MODE_MANUAL}>{VEHICLE_LOG_APPROVAL_MODE_MANUAL}</option>
            <option value={VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC}>{VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC}</option>
          </select>
        </label>
        <label>
          차량관리자 이메일
          <input name="vehicleManagerEmail" defaultValue={settings.vehicleManagerEmail} style={{ width: '100%', padding: 6 }} />
        </label>
        <button type="submit">저장</button>
      </form>
    </main>
  );
}
