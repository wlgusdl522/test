import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import {
  getAllAgendaItems,
  getMeetings,
  getNextRound,
  isLaborCouncilMember,
} from '@/lib/mutate/laborCouncil';
import LaborCouncilTabs from '@/components/laborCouncil/LaborCouncilTabs';
import FormToggle from '@/components/FormToggle';
import SubmitButton from '@/components/SubmitButton';
import { badgeBase, badgeTone, btn, btnOutline, btnSecondary, card, h1, input, label as labelCls, pageFluid } from '@/lib/ui';
import { addMeetingAction, setMeetingStatusAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LaborCouncilMeetingsPage() {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const me = await getViewerStaffRecord();
  const email = me?.['이메일(아이디)'] ?? '';
  const [meetings, allAgenda, isCouncil, nextRound] = await Promise.all([
    getMeetings(),
    getAllAgendaItems(),
    isLaborCouncilMember(email),
    getNextRound(),
  ]);

  const upcoming = meetings.filter((m) => m.상태 === '예정');
  const past = meetings.filter((m) => m.상태 === '완료');

  function agendaFor(회차: string) {
    return allAgenda.filter((a) => a.상정회차 === 회차);
  }

  function MeetingCard({ m }: { m: (typeof meetings)[number] }) {
    const items = agendaFor(m.회차);
    return (
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">제 {m.회차}차 노사협의회</span>
              <span className={`${badgeBase} ${badgeTone[m.상태 === '완료' ? 'gray' : 'blue']}`}>{m.상태}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-300">
              <span>{m.회의일시 || '일시 미정'}</span>
              <span>{m.회의장소 || '장소 미정'}</span>
            </div>
          </div>
          {isCouncil && (
            <div className="flex gap-2">
              <Link href={`/labor-council/minutes?round=${m.회차}`} className={btnSecondary}>회의록 작성</Link>
              <form action={setMeetingStatusAction}>
                <input type="hidden" name="회차" value={m.회차} />
                <input type="hidden" name="상태" value={m.상태 === '완료' ? '예정' : '완료'} />
                <button type="submit" className={btnOutline}>{m.상태 === '완료' ? '예정으로 되돌리기' : '완료로 표시'}</button>
              </form>
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">상정 안건 ({items.length}건)</div>
        {items.length === 0 ? (
          <div className="text-sm text-zinc-400">
            아직 상정된 안건이 없습니다. &quot;안건 현황&quot; 탭에서 안건에 이 회차를 지정해주세요.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11px] font-bold text-brand">{i + 1}</span>
                {a.항목명 || '(제목 없음)'}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className={pageFluid}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>인사관리 &gt; 노사협의회</h1>
        {isCouncil && (
          <FormToggle label="새 회의 등록" buttonClassName={btn} wrapperClassName="">
            <form action={addMeetingAction} className="flex flex-col gap-3">
              <label className={labelCls}>
                회차
                <input name="회차" defaultValue={nextRound} className={input} />
              </label>
              <label className={labelCls}>
                회의일시
                <input type="datetime-local" name="회의일시" className={input} />
              </label>
              <label className={labelCls}>
                회의장소
                <input name="회의장소" className={input} />
              </label>
              <SubmitButton className={btn} pendingLabel="등록 중...">등록</SubmitButton>
            </form>
          </FormToggle>
        )}
      </div>
      <LaborCouncilTabs />

      <h2 className="mb-2 text-[13px] font-bold text-brand-dark dark:text-brand">예정 회의</h2>
      <div className="flex flex-col gap-4 mb-8">
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-400">예정된 회의가 없습니다.</p>
        ) : (
          upcoming.map((m) => <MeetingCard key={m.회차} m={m} />)
        )}
      </div>

      <h2 className="mb-2 text-[13px] font-bold text-brand-dark dark:text-brand">지난 회의</h2>
      <div className="flex flex-col gap-4">
        {past.length === 0 ? (
          <p className="text-sm text-zinc-400">지난 회의가 없습니다.</p>
        ) : (
          past.map((m) => <MeetingCard key={m.회차} m={m} />)
        )}
      </div>
    </main>
  );
}
