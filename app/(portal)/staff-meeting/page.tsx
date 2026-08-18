import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import EntryClient from '@/components/staffMeeting/EntryClient';
import ItemManageModal from '@/components/staffMeeting/ItemManageModal';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getStaffMeetingItems, getStaffMeetingValues, prevPlanFor, valueFor } from '@/lib/mutate/staffMeeting';
import { btnOutline, card, h1, inputBase, pageFluid } from '@/lib/ui';

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

  const [teams, me] = await Promise.all([getSimpleList(TEAM_LIST_SHEET_NAME), getViewerStaffRecord()]);
  const { team: teamParam, ym: ymParam } = await searchParams;
  const myTeam = me?.소속팀 ?? '';
  const 팀명 = teams.includes(teamParam ?? '')
    ? (teamParam as string)
    : teams.includes(myTeam)
      ? myTeam
      : (teams[0] ?? '');
  const ym = ymParam || currentYm();

  const items = 팀명 ? await getStaffMeetingItems(팀명) : [];
  const values = await getStaffMeetingValues(items.map((i) => i.id));

  const rows = items.map((i) => {
    const v = valueFor(values, i.id, ym);
    return {
      id: i.id,
      사업구분: i.사업구분,
      업무보고: v?.업무보고 ?? '',
      업무계획: v?.업무계획 ?? '',
      협조사항: v?.협조사항 ?? '',
      지난달계획: prevPlanFor(values, i.id, ym),
      발표포함: v?.발표포함 ?? false,
    };
  });

  return (
    <main className={pageFluid}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>업무관리 &gt; 전체회의자료</h1>
        <Link href="/staff-meeting/view" className={btnOutline}>보기 전용 화면</Link>
      </div>

      <form method="get" className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">팀</label>
        <select name="team" defaultValue={팀명} className={`${inputBase} w-auto`}>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnOutline}>조회</button>
      </form>

      {!팀명 ? (
        <div className={card}>설정 &gt; 팀 / 직급 / 결재라인 화면에서 팀을 먼저 등록해주세요.</div>
      ) : (
        <>
          <ItemManageModal 팀명={팀명} items={items} />
          <div className={card}>
            <EntryClient 팀명={팀명} ym={ym} rows={rows} />
          </div>
        </>
      )}
    </main>
  );
}
