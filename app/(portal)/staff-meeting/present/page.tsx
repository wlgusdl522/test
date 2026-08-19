import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import PresentClient from '@/components/staffMeeting/PresentClient';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import {
  formatMeetingDateTime,
  getOrderedStaffMeetingTeams,
  getStaffMeetingInfo,
  getStaffMeetingItems,
  getStaffMeetingValues,
  valueFor,
} from '@/lib/mutate/staffMeeting';
import { getStaffMeetingContext } from '@/lib/prefs-actions';
import { pageFluid } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function currentYm(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 7);
}

export default async function StaffMeetingPresentPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('staff-meeting'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const cookieCtx = await getStaffMeetingContext();
  const ym = ymParam || cookieCtx.ym || currentYm();

  const [teams, meetingInfo] = await Promise.all([getSimpleList(TEAM_LIST_SHEET_NAME), getStaffMeetingInfo(ym)]);
  const orderedTeams = await getOrderedStaffMeetingTeams(teams);

  const teamData = await Promise.all(
    orderedTeams.map(async (team) => {
      const items = await getStaffMeetingItems(team);
      const values = await getStaffMeetingValues(items.map((i) => i.id));
      return { team, items, values };
    })
  );

  // 실제 화면에 얼마나 들어가는지는 브라우저에서 렌더링해봐야 정확히 알 수 있으므로,
  // 여기서는 원본 데이터만 넘기고 페이지 분할(몇 개씩 보여줄지)은 PresentClient가
  // 실제 렌더링 높이를 측정해서 화면에 꽉 차게 동적으로 나눈다.
  const sections = teamData
    .filter(({ items }) => items.length > 0)
    .map(({ team, items, values }) => ({
      team,
      rows: items.map((i) => {
        const v = valueFor(values, i.id, ym);
        return {
          id: i.id,
          사업구분: i.사업구분,
          업무보고: v?.업무보고 ?? '',
          업무계획: v?.업무계획 ?? '',
          협조사항: v?.협조사항 ?? '',
        };
      }),
    }));

  return (
    <main className={pageFluid}>
      <PresentClient
        ym={ym}
        reportLabel={meetingInfo.업무보고기간}
        planLabel={meetingInfo.업무계획기간}
        meetingDateTime={meetingInfo.회의일시 ? formatMeetingDateTime(meetingInfo.회의일시) : ''}
        place={meetingInfo.장소}
        host={meetingInfo.진행}
        attendingTeams={meetingInfo.참석부서}
        sections={sections}
      />
    </main>
  );
}
