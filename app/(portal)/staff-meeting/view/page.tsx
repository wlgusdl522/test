import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getStaffMeetingItems, getStaffMeetingValues, nextYm, valueFor } from '@/lib/mutate/staffMeeting';
import SubmitButton from '@/components/SubmitButton';
import { getStaffMeetingContext, setStaffMeetingContextAction } from '@/lib/prefs-actions';
import { btnOutline, card, h1, inputBase, pageFluid, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function currentYm(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 7);
}

function ymLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}년 ${Number(m)}월`;
}

export default async function StaffMeetingViewPage({
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

  return (
    <main className={pageFluid}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>업무관리 &gt; 전체회의자료 (보기)</h1>
        <Link
          href={`/staff-meeting?team=${encodeURIComponent(팀명)}&ym=${ym}`}
          className={btnOutline}
        >
          수정하기
        </Link>
      </div>

      <form action={setStaffMeetingContextAction} className="mb-5 flex flex-wrap items-center gap-3">
        <input type="hidden" name="redirectTo" value="/staff-meeting/view" />
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

      {!팀명 ? (
        <div className={card}>설정 &gt; 팀 / 직급 / 결재라인 화면에서 팀을 먼저 등록해주세요.</div>
      ) : (
        <div className={card}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{팀명}</div>
          </div>
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>사업구분</th>
                  <th className={th}>{ymLabel(ym)} 업무보고</th>
                  <th className={th}>{ymLabel(nextYm(ym))} 업무계획</th>
                  <th className={th}>타 부서 협조사항 및 기타</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td className={`${td} text-center text-zinc-400`} colSpan={4}>등록된 사업구분이 없습니다.</td>
                  </tr>
                )}
                {items.map((i) => {
                  const v = valueFor(values, i.id, ym);
                  return (
                    <tr key={i.id}>
                      <td className={`${td} whitespace-pre-wrap font-semibold align-top`}>{i.사업구분}</td>
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
      )}
    </main>
  );
}
