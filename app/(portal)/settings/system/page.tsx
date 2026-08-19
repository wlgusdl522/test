import { getSystemSettings, VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC, VEHICLE_LOG_APPROVAL_MODE_MANUAL } from '@/lib/mutate/settings';
import { btn, h1, hint, input, label, pageFluid } from '@/lib/ui';
import { saveCertificateSealAction, saveSystemSettingsAction } from './actions';

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
          물품출납원 이메일 (비품등록번호 입력·확인)
          <input name="itemCheckAssetManagerEmail" defaultValue={settings.itemCheckAssetManagerEmail} className={input} />
        </label>
        <label className={label}>
          총무과장 이메일 (비품 건 최종승인)
          <input name="itemCheckGeneralAffairsManagerEmail" defaultValue={settings.itemCheckGeneralAffairsManagerEmail} className={input} />
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
        <label className={label}>
          증명서 발급 최종승인자 이메일
          <input name="certificateApproverEmail" defaultValue={settings.certificateApproverEmail} className={input} />
        </label>
        <label className={label}>
          증명서 발급 담당(서무) 이메일
          <input name="certificateClerkEmail" defaultValue={settings.certificateClerkEmail} className={input} />
        </label>
        <label className={label}>
          전체회의자료 JANDI 공용 웹훅 (회의 알림)
          <input name="staffMeetingJandiWebhook" defaultValue={settings.staffMeetingJandiWebhook} className={input} />
        </label>
        <div>
          <button type="submit" className={btn}>저장</button>
        </div>
      </form>

      <h2 className="mt-8 mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">증명서 발급 기관 직인</h2>
      <p className={hint}>증명서 PDF에 찍히는 기관 직인 이미지입니다. 배경이 투명한 PNG를 권장합니다.</p>
      <form action={saveCertificateSealAction} encType="multipart/form-data" className="flex flex-col gap-2">
        {settings.certificateSealImageUrl && (
          <p className="text-xs text-zinc-500">
            현재 등록됨 — <a href={settings.certificateSealImageUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">이미지 보기</a>
          </p>
        )}
        <input type="file" name="seal" accept="image/*" className={input} />
        <div>
          <button type="submit" className={btn}>직인 이미지 등록</button>
        </div>
      </form>
    </main>
  );
}
