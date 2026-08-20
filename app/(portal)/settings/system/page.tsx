import { getActiveStaffList } from '@/lib/mutate/permissions';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { getSystemSettings, VEHICLE_LOG_APPROVAL_MODE_ELECTRONIC, VEHICLE_LOG_APPROVAL_MODE_MANUAL } from '@/lib/mutate/settings';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { btn, h1, hint, input, label, pageFluid } from '@/lib/ui';
import { saveCertificateSealAction, saveSystemSettingsAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function SystemSettingsPage() {
  const [settings, staff, teams] = await Promise.all([
    getSystemSettings(),
    getActiveStaffList(),
    getSimpleList(TEAM_LIST_SHEET_NAME),
  ]);
  const staffGroups = teams
    .map((team) => ({ team, staff: staff.filter((s) => s.team === team) }))
    .filter((g) => g.staff.length > 0);
  const checkedSenderEmails = settings.staffMeetingNotifySenderEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

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
          물품출납원 이메일 (비품 등록건 비품등록번호 입력·승인)
          <input name="itemCheckAssetManagerEmail" defaultValue={settings.itemCheckAssetManagerEmail} className={input} />
        </label>
        <label className={label}>
          총무과장 이메일 (비품 등록건 최종승인)
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
          증명서 발급 담당(서무)
          <select name="certificateClerkEmail" defaultValue={settings.certificateClerkEmail} className={input}>
            <option value="">(지정 안 함)</option>
            {staff.map((s) => (
              <option key={s.email} value={s.email}>{s.name} ({s.team})</option>
            ))}
          </select>
        </label>
        <label className={label}>
          전체회의 JANDI 공용 웹훅 (회의 알림)
          <input name="staffMeetingJandiWebhook" defaultValue={settings.staffMeetingJandiWebhook} className={input} />
        </label>
        <label className={label}>
          노사협의회 JANDI 웹훅 (안건취합 기간 알림)
          <input name="laborCouncilJandiWebhook" defaultValue={settings.laborCouncilJandiWebhook} className={input} />
        </label>
        <label className={label}>
          전체회의 회의정보 편집 가능 팀 (비우면 제한 없음)
          <input name="staffMeetingInfoEditTeam" defaultValue={settings.staffMeetingInfoEditTeam} placeholder="예: 총무팀" className={input} />
        </label>
        <label className={label}>
          전체회의 회의정보 편집 가능 담당자 이메일 (쉼표로 여러 명, 비우면 제한 없음)
          <input name="staffMeetingInfoEditEmails" defaultValue={settings.staffMeetingInfoEditEmails} className={input} />
        </label>
        <div className={label}>
          전체회의 잔디 알림 보내기 가능 담당자 (여러 명 선택 가능, 아무도 선택 안 하면 제한 없음)
          <div className="mt-1 flex max-h-56 flex-wrap gap-x-4 gap-y-3 overflow-y-auto rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
            {staffGroups.map((g) => (
              <div
                key={g.team}
                className="flex min-w-[130px] flex-1 flex-col gap-1.5 border-l border-dashed border-zinc-200 pl-3 first:border-l-0 first:pl-0 dark:border-zinc-700"
              >
                <div className="text-[10.5px] font-bold text-zinc-400">{g.team}</div>
                {g.staff.map((s) => (
                  <label key={s.email} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      name="staffMeetingNotifySenderEmails"
                      value={s.email}
                      defaultChecked={checkedSenderEmails.includes(s.email.toLowerCase())}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
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
