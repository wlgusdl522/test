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
import { pageFluid, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 원본 구글슬라이드가 한 장에 사업구분 2개 정도만 담던 것과 맞춰, 팀당 사업구분이 이 개수를
// 넘으면 자동으로 다음 장으로 나눈다.
const ITEMS_PER_PAGE = 2;

function currentYm(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 7);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

  const pages: React.ReactNode[] = [];

  pages.push(
    <div key="cover" className="flex h-full flex-col items-center justify-center text-center">
      <h1 className="mb-10 text-6xl font-bold leading-snug">
        {meetingInfo.업무보고기간} 보고 및<br />
        {meetingInfo.업무계획기간} 계획
      </h1>
      {(meetingInfo.회의일시 || meetingInfo.장소 || meetingInfo.진행 || meetingInfo.참석부서) && (
        <div className="rounded-lg bg-amber-50 px-8 py-6 text-left text-2xl leading-loose dark:bg-amber-500/10">
          {meetingInfo.회의일시 && <div><b>회의일시</b> : {formatMeetingDateTime(meetingInfo.회의일시)}</div>}
          {meetingInfo.장소 && <div><b>장소</b> : {meetingInfo.장소}</div>}
          {meetingInfo.진행 && <div><b>진행</b> : {meetingInfo.진행}</div>}
          {meetingInfo.참석부서 && <div><b>참석부서</b> : {meetingInfo.참석부서}</div>}
        </div>
      )}
    </div>
  );

  for (const { team, items, values } of teamData) {
    if (items.length === 0) continue;
    const chunks = chunk(items, ITEMS_PER_PAGE);
    chunks.forEach((group, gi) => {
      pages.push(
        <div key={`${team}-${gi}`}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, fontWeight: 700 }}>{team}</div>
          </div>
          <div className={tableWrap}>
            <table className={table} style={{ fontSize: '21px' }}>
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={th}>사업구분</th>
                  <th className={th}>{meetingInfo.업무보고기간} 업무보고</th>
                  <th className={th}>{meetingInfo.업무계획기간} 업무계획</th>
                  <th className={th}>타 부서 협조사항 및 기타</th>
                </tr>
              </thead>
              <tbody>
                {group.map((i) => {
                  const v = valueFor(values, i.id, ym);
                  return (
                    <tr key={i.id}>
                      <td className={`${td} whitespace-nowrap font-semibold align-top`}>{i.사업구분}</td>
                      <td className={`${td} align-top whitespace-pre-wrap`}>{v?.업무보고 ?? ''}</td>
                      <td className={`${td} align-top whitespace-pre-wrap`}>{v?.업무계획 ?? ''}</td>
                      <td className={`${td} align-top whitespace-pre-wrap`}>{v?.협조사항 ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    });
  }

  return (
    <main className={pageFluid}>
      <PresentClient pages={pages} ym={ym} />
    </main>
  );
}
