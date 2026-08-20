import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import EntryClient from '@/components/staffMeeting/EntryClient';
import FormToggle from '@/components/FormToggle';
import MeetingSettingsMenu from '@/components/staffMeeting/MeetingSettingsMenu';
import StaffMeetingInfoSection from '@/components/staffMeeting/StaffMeetingInfoSection';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import {
  buildStaffMeetingNotificationContent,
  buildStaffMeetingNotificationTitle,
  canEditStaffMeetingInfo,
  canSendStaffMeetingNotification,
  formatMeetingDateTime,
  getOrderedStaffMeetingTeams,
  getStaffMeetingInfo,
  getStaffMeetingItems,
  getStaffMeetingValues,
  prevPlanFor,
  valueFor,
} from '@/lib/mutate/staffMeeting';
import SubmitButton from '@/components/SubmitButton';
import { getStaffMeetingContext, setStaffMeetingContextAction } from '@/lib/prefs-actions';
import { btn, btnOutline, btnSecondary, btnSuccess, card, h1, hint, input, inputBase, label, pageFluid } from '@/lib/ui';
import { sendStaffMeetingNotificationAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function currentYm(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 7);
}

export default async function StaffMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; ym?: string }>;
}) {
  if (!(await hasPageAccess('staff-meeting'))) return <PageAccessDenied />;

  const [teams, me, cookieCtx, canSendNotification, canEditInfo] = await Promise.all([
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getViewerStaffRecord(),
    getStaffMeetingContext(),
    canSendStaffMeetingNotification(),
    canEditStaffMeetingInfo(),
  ]);
  const { team: teamParam, ym: ymParam } = await searchParams;
  const myTeam = me?.소속팀 ?? '';
  const 팀명 = teams.includes(teamParam ?? '')
    ? (teamParam as string)
    : teams.includes(cookieCtx.team)
      ? cookieCtx.team
      : teams.includes(myTeam)
        ? myTeam
        : (teams[0] ?? '');
  const ym = ymParam || cookieCtx.ym || currentYm();

  const items = 팀명 ? await getStaffMeetingItems(팀명) : [];
  const values = await getStaffMeetingValues(items.map((i) => i.id));
  const meetingInfo = await getStaffMeetingInfo(ym);
  const orderedTeams = await getOrderedStaffMeetingTeams(teams);

  const rows = items.map((i) => {
    const v = valueFor(values, i.id, ym);
    return {
      id: i.id,
      사업구분: i.사업구분,
      업무보고: v?.업무보고 ?? '',
      업무계획: v?.업무계획 ?? '',
      협조사항: v?.협조사항 ?? '',
      지난달계획: prevPlanFor(values, i.id, ym),
    };
  });

  return (
    <main className={pageFluid}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>업무관리 &gt; 전체회의</h1>
        <div className="flex gap-2">
          <Link href={`/staff-meeting/present?ym=${ym}`} className={btnSecondary}>발표 모드</Link>
          <MeetingSettingsMenu
            orderedTeams={orderedTeams}
            팀명={팀명}
            items={items}
          />
          {canSendNotification && (
            <FormToggle label="잔디 알림 보내기" buttonLabel="🟢 잔디 알림 보내기" buttonClassName={btnSuccess} wrapperClassName="">
              <form action={sendStaffMeetingNotificationAction}>
                <input type="hidden" name="년월" value={ym} />
                <label className={label}>
                  제목
                  <input name="제목" defaultValue={buildStaffMeetingNotificationTitle(ym)} className={input} />
                </label>
                <label className={`${label} mt-3`}>
                  내용
                  <textarea
                    name="내용"
                    rows={7}
                    defaultValue={buildStaffMeetingNotificationContent(meetingInfo)}
                    className={`${input} whitespace-pre-wrap`}
                  />
                </label>
                <div className="mt-4 flex items-center gap-3">
                  <SubmitButton className={btn} pendingLabel="보내는 중...">전송</SubmitButton>
                  {meetingInfo.알림발송일시 && (
                    <span className="text-xs text-zinc-400">마지막 발송: {meetingInfo.알림발송일시}</span>
                  )}
                </div>
              </form>
            </FormToggle>
          )}
        </div>
      </div>

      <form action={setStaffMeetingContextAction} className="mb-5 flex flex-wrap items-center gap-3">
        <input type="hidden" name="redirectTo" value="/staff-meeting" />
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">팀</label>
        <select name="team" defaultValue={팀명} className={`${inputBase} w-auto`}>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <SubmitButton className={btnOutline} pendingLabel="조회 중...">조회</SubmitButton>
        <StaffMeetingInfoSection ym={ym} meta={meetingInfo} canEdit={canEditInfo} />
      </form>

      <div className="mb-6 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-zinc-600 dark:text-zinc-400 font-medium">회의일시</div>
            <div className="text-zinc-900 dark:text-zinc-100">
              {meetingInfo.회의일시 ? formatMeetingDateTime(meetingInfo.회의일시) : '미설정'}
            </div>
          </div>
          <div>
            <div className="text-zinc-600 dark:text-zinc-400 font-medium">회의장소</div>
            <div className="text-zinc-900 dark:text-zinc-100">{meetingInfo.장소 || '미설정'}</div>
          </div>
        </div>
      </div>

      {!팀명 ? (
        <div className={card}>설정 &gt; 팀 / 직급 / 결재라인 화면에서 팀을 먼저 등록해주세요.</div>
      ) : (
        <div className={card}>
          <EntryClient
            팀명={팀명}
            ym={ym}
            rows={rows}
            reportLabel={meetingInfo.업무보고기간}
            planLabel={meetingInfo.업무계획기간}
          />
        </div>
      )}
    </main>
  );
}
