import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import {
  canSeeRealProposerName,
  displayedProposerName,
  getAllAgendaItems,
  getMeetings,
  getMinutes,
  getMyAgendaItems,
} from '@/lib/mutate/laborCouncil';
import { formatMeetingDateTime } from '@/lib/mutate/staffMeeting';
import LaborCouncilTabs from '@/components/laborCouncil/LaborCouncilTabs';
import AgendaProgressFlow from '@/components/laborCouncil/AgendaProgressFlow';
import { badgeBase, badgeTone, h1, pageFluid, table, tableWrap, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OVERVIEW_ROW_LIMIT = 5;
const MY_ITEMS_LIMIT = 3;

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default async function LaborCouncilOverviewPage() {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const me = await getViewerStaffRecord();
  const email = me?.['이메일(아이디)'] ?? '';
  const [allItems, myItems, canSeeRealName, meetings] = await Promise.all([
    getAllAgendaItems(),
    getMyAgendaItems(email),
    canSeeRealProposerName(email),
    getMeetings(),
  ]);

  const recentItems = allItems.slice(0, OVERVIEW_ROW_LIMIT);

  const nextMeeting = meetings
    .filter((m) => m.상태 === '예정' && m.회의일시)
    .sort((a, b) => a.회의일시.localeCompare(b.회의일시))[0];
  const latestDone = meetings
    .filter((m) => m.상태 === '완료')
    .sort((a, b) => b.회차.localeCompare(a.회차))[0];
  const latestMinutes = latestDone ? await getMinutes(latestDone.회차) : null;
  const latestAttendCount = latestMinutes?.참석자.filter((a) => a.참석).length ?? 0;

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-4`}>인사관리 &gt; 노사협의회</h1>
      <LaborCouncilTabs />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">

        {/* 안건 현황 (최신 몇 건) */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-sm font-bold text-brand-dark dark:text-brand">
              안건 현황 <span className="ml-1 text-xs font-normal text-zinc-400">전체 {allItems.length}건</span>
            </div>
            <Link href="/labor-council/status" className="text-xs text-brand hover:text-brand-dark">전체 보기 →</Link>
          </div>

          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={`${th} w-9`}>번호</th>
                  <th className={th}>안건 제목</th>
                  <th className={`${th} w-16`}>제안자</th>
                  <th className={`${th} w-24`}>접수일</th>
                  <th className={`${th} w-72`}>진행상황</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.length === 0 && (
                  <tr><td className={td} colSpan={5}>등록된 안건이 없습니다.</td></tr>
                )}
                {recentItems.map((item, i) => (
                  <tr key={item.id}>
                    <td className={`${td} text-zinc-400`}>{allItems.length - i}</td>
                    <td className={`${td} font-medium`}>{item.항목명 || '(제목 없음)'}</td>
                    <td className={`${td} text-zinc-500 dark:text-zinc-400`}>{displayedProposerName(item, canSeeRealName)}</td>
                    <td className={`${td} text-zinc-500 dark:text-zinc-400`}>{item.등록일시.slice(0, 10)}</td>
                    <td className={td}>
                      <AgendaProgressFlow status={item.상태} round={item.상정회차} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 우측 요약 카드 */}
        <div className="flex flex-col gap-4">

          {/* 예정 회의 */}
          <div className="rounded-lg border-l-[3px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-zinc-900" style={{ borderLeftColor: '#1d4ed8' }}>
            <div className="mb-2.5 text-xs font-bold text-brand-dark dark:text-brand">예정 회의</div>
            {nextMeeting ? (
              <>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">제{nextMeeting.회차}차 노사협의회</span>
                  <span className={`${badgeBase} ${badgeTone.blue}`}>예정</span>
                </div>
                <div className="flex flex-col gap-1.5 text-[12.5px] text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5"><CalendarIcon />{formatMeetingDateTime(nextMeeting.회의일시)}</div>
                  {nextMeeting.회의장소 && <div className="flex items-center gap-1.5"><PinIcon />{nextMeeting.회의장소}</div>}
                </div>
                <Link href="/labor-council/meetings" className="mt-2.5 inline-block text-xs text-brand hover:text-brand-dark">회의 관리 바로가기 →</Link>
              </>
            ) : (
              <p className="text-xs text-zinc-400">예정된 회의가 없습니다.</p>
            )}
          </div>

          {/* 최근 회의록 */}
          <div className="rounded-lg border-l-[3px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-zinc-900" style={{ borderLeftColor: '#047857' }}>
            <div className="mb-2.5 text-xs font-bold text-brand-dark dark:text-brand">최근 회의록</div>
            {latestDone && latestMinutes ? (
              <>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">제{latestDone.회차}차 노사협의회</span>
                  <span className={`${badgeBase} ${badgeTone.green}`}>협의완료</span>
                </div>
                <div className="flex flex-col gap-1.5 text-[12.5px] text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5"><CalendarIcon />{formatMeetingDateTime(latestDone.회의일시)}</div>
                  <div>상정 안건 {latestMinutes.협의의결.length}건 · 참석 {latestAttendCount}명</div>
                </div>
                <Link href={`/labor-council/minutes?round=${latestDone.회차}`} className="mt-2.5 inline-block text-xs text-brand hover:text-brand-dark">회의록 보기 →</Link>
              </>
            ) : (
              <p className="text-xs text-zinc-400">등록된 회의록이 없습니다.</p>
            )}
          </div>

          {/* 나의 안건 진행 현황 */}
          <div className="rounded-lg border-l-[3px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-zinc-900" style={{ borderLeftColor: '#d97706' }}>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-xs font-bold text-brand-dark dark:text-brand">나의 안건 진행 현황</div>
              <Link href="/labor-council/propose" className="text-[11px] text-brand hover:text-brand-dark">더보기</Link>
            </div>
            {myItems.length === 0 ? (
              <p className="text-xs text-zinc-400">아직 제안한 안건이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {myItems.slice(0, MY_ITEMS_LIMIT).map((item) => (
                  <div key={item.id} className="border-t border-zinc-100 pt-2.5 first:border-t-0 first:pt-0 dark:border-zinc-800">
                    <div className="mb-1.5 text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{item.항목명 || '(제목 없음)'}</div>
                    <AgendaProgressFlow status={item.상태} compact />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
