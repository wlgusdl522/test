import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import EntryClient from '@/components/staffMeeting/EntryClient';
import ItemManageModal from '@/components/staffMeeting/ItemManageModal';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import {
  buildStaffMeetingNotificationMessage,
  getStaffMeetingInfo,
  getStaffMeetingItems,
  getStaffMeetingValues,
  prevPlanFor,
  valueFor,
} from '@/lib/mutate/staffMeeting';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import SubmitButton from '@/components/SubmitButton';
import { getStaffMeetingContext, setStaffMeetingContextAction } from '@/lib/prefs-actions';
import { btn, btnOutline, btnSecondary, card, h1, h2, input, inputBase, label, pageFluid } from '@/lib/ui';
import { saveStaffMeetingInfoAction, sendStaffMeetingNotificationAction } from './actions';

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

  const [teams, me, cookieCtx] = await Promise.all([
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getViewerStaffRecord(),
    getStaffMeetingContext(),
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
        <h1 className={h1}>업무관리 &gt; 전체회의자료</h1>
        <div className="flex gap-2">
          <Link
            href={`/staff-meeting/view?team=${encodeURIComponent(팀명)}&ym=${ym}`}
            className={btnOutline}
          >
            보기 전용 화면
          </Link>
          <Link href={`/staff-meeting/present?ym=${ym}`} className={btnOutline}>발표 모드</Link>
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
      </form>

      <div className={card}>
        <h2 className={`${h2} mb-3`}>{ym} 회의 정보</h2>
        <form action={saveStaffMeetingInfoAction}>
          <input type="hidden" name="년월" value={ym} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className={label}>
              회의일시
              <input type="datetime-local" name="회의일시" defaultValue={meetingInfo.회의일시} className={input} />
            </label>
            <label className={label}>
              장소
              <input name="장소" defaultValue={meetingInfo.장소} className={input} />
            </label>
            <label className={label}>
              진행
              <input name="진행" defaultValue={meetingInfo.진행} className={input} />
            </label>
            <label className={label}>
              참석부서
              <input name="참석부서" defaultValue={meetingInfo.참석부서} className={input} />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className={label}>
              업무보고 표시(비우면 자동)
              <input name="업무보고기간" defaultValue={meetingInfo.업무보고기간} placeholder="예: 2026년 5~6월" className={input} />
            </label>
            <label className={label}>
              업무계획 표시(비우면 자동)
              <input name="업무계획기간" defaultValue={meetingInfo.업무계획기간} placeholder="예: 2026년 7월" className={input} />
            </label>
            <div className="col-span-2 flex items-end md:col-span-1">
              <SubmitButton className={btn} pendingLabel="저장 중...">저장</SubmitButton>
            </div>
          </div>
        </form>

        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <form action={sendStaffMeetingNotificationAction}>
            <input type="hidden" name="년월" value={ym} />
            <label className={label}>
              잔디로 보낼 문구(수정 가능)
              <textarea
                name="메시지"
                rows={5}
                defaultValue={buildStaffMeetingNotificationMessage(ym, meetingInfo)}
                className={`${input} whitespace-pre-wrap`}
              />
            </label>
            <div className="mt-2 flex items-center gap-3">
              <ConfirmSubmitButton
                confirmMessage="위 문구로 잔디 공용 채널에 지금 바로 보낼까요?"
                className={btnSecondary}
              >
                잔디 알림 보내기
              </ConfirmSubmitButton>
              {meetingInfo.알림발송일시 && (
                <span className="text-xs text-zinc-400">마지막 발송: {meetingInfo.알림발송일시}</span>
              )}
            </div>
          </form>
        </div>
      </div>

      {!팀명 ? (
        <div className={card}>설정 &gt; 팀 / 직급 / 결재라인 화면에서 팀을 먼저 등록해주세요.</div>
      ) : (
        <>
          <ItemManageModal 팀명={팀명} items={items} />
          <div className={card}>
            <EntryClient
              팀명={팀명}
              ym={ym}
              rows={rows}
              reportLabel={meetingInfo.업무보고기간}
              planLabel={meetingInfo.업무계획기간}
            />
          </div>
        </>
      )}
    </main>
  );
}
