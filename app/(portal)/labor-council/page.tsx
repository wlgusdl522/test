import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import {
  buildAgendaNotificationContent,
  buildAgendaNotificationTitle,
  canEditLaborCouncilMinutes,
  getAgendaItems,
  getAgendaRounds,
  getNextRound,
  getRoundInfo,
  isWithinAgendaPeriod,
} from '@/lib/mutate/laborCouncil';
import LaborCouncilTabs from '@/components/laborCouncil/LaborCouncilTabs';
import FormToggle from '@/components/FormToggle';
import SubmitButton from '@/components/SubmitButton';
import {
  badgeBase, badgeTone, btn, btnDanger, btnOutline, btnSuccess, card, h1, h2, hint,
  input, inputBase, label as labelCls, pageFluid,
} from '@/lib/ui';
import {
  addAgendaItemAction, deleteAgendaItemAction, saveRoundInfoAction, sendAgendaNotificationAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function LaborCouncilPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const [rounds, canEdit] = await Promise.all([getAgendaRounds(), canEditLaborCouncilMinutes()]);
  const { round: roundParam } = await searchParams;
  const 회차 = roundParam || rounds[0] || (await getNextRound());
  const [items, roundInfo, nextRound] = await Promise.all([
    getAgendaItems(회차),
    getRoundInfo(회차),
    getNextRound(),
  ]);
  const today = todayKst();
  const isOpen = isWithinAgendaPeriod(roundInfo, today);
  const canSubmit = canEdit || isOpen;
  const periodStatus = !roundInfo.안건취합시작일 && !roundInfo.안건취합마감일
    ? null
    : isOpen
      ? { label: '취합중', tone: 'green' as const }
      : roundInfo.안건취합시작일 && today < roundInfo.안건취합시작일
        ? { label: '시작 전', tone: 'gray' as const }
        : { label: '마감', tone: 'red' as const };

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>인사관리 &gt; 노사협의회</h1>
      <LaborCouncilTabs 회차={회차} />

      <form method="get" className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">회차</label>
        <select name="round" defaultValue={회차} className={`${inputBase} w-auto`}>
          {!rounds.includes(회차) && <option value={회차}>{회차}차 (신규)</option>}
          {rounds.map((r) => <option key={r} value={r}>{r}차</option>)}
        </select>
        <SubmitButton className={btnOutline} pendingLabel="조회 중...">조회</SubmitButton>
        {canEdit && 회차 !== nextRound && (
          <Link href={`/labor-council?round=${nextRound}`} className={btn}>+ {nextRound}차 새로 시작</Link>
        )}
      </form>

      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
        <span>
          안건취합 기간 : {roundInfo.안건취합시작일 || '제한없음'} ~ {roundInfo.안건취합마감일 || '제한없음'}
        </span>
        {periodStatus && <span className={`${badgeBase} ${badgeTone[periodStatus.tone]}`}>{periodStatus.label}</span>}
        {canEdit && (
          <>
            <FormToggle label="기간 설정" buttonClassName={btnOutline} wrapperClassName="">
              <form action={saveRoundInfoAction} className="flex flex-col gap-3">
                <input type="hidden" name="회차" value={회차} />
                <label className={labelCls}>
                  시작일
                  <input type="date" name="안건취합시작일" defaultValue={roundInfo.안건취합시작일} className={input} />
                </label>
                <label className={labelCls}>
                  마감일
                  <input type="date" name="안건취합마감일" defaultValue={roundInfo.안건취합마감일} className={input} />
                </label>
                <SubmitButton className={btn} pendingLabel="저장 중...">저장</SubmitButton>
              </form>
            </FormToggle>
            <FormToggle label="잔디 알림 보내기" buttonLabel="🟢 잔디 알림 보내기" buttonClassName={btnSuccess} wrapperClassName="">
              <form action={sendAgendaNotificationAction} className="flex flex-col gap-3">
                <input type="hidden" name="회차" value={회차} />
                <label className={labelCls}>
                  제목
                  <input name="제목" defaultValue={buildAgendaNotificationTitle(회차)} className={input} />
                </label>
                <label className={labelCls}>
                  내용
                  <textarea
                    name="내용"
                    rows={5}
                    defaultValue={buildAgendaNotificationContent(roundInfo)}
                    className={`${input} whitespace-pre-wrap`}
                  />
                </label>
                <div className="flex items-center gap-3">
                  <SubmitButton className={btn} pendingLabel="보내는 중...">전송</SubmitButton>
                  {roundInfo.알림발송일시 && (
                    <span className="text-xs text-zinc-400">마지막 발송: {roundInfo.알림발송일시}</span>
                  )}
                </div>
              </form>
            </FormToggle>
          </>
        )}
      </div>

      <p className={hint}>
        업무고충이나 안건이 있으면 누구나 등록할 수 있습니다. 취합 기간·새 회차 시작·잔디 알림은
        노사협의회 위원만 할 수 있고, 위원은 회의 전 내용을 확인·정리한 뒤 &quot;회의록&quot; 탭에서
        협의사항으로 옮겨 논의 결과를 기록합니다.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className={card}>
          <h2 className={h2}>안건 등록</h2>
          {canSubmit ? (
            <form action={addAgendaItemAction} className="flex flex-col gap-3">
              <input type="hidden" name="회차" value={회차} />
              <label className={labelCls}>
                업무고충처리 관련(항목명)
                <input name="항목명" className={input} placeholder="예: 출근부 관리 업무 개선" />
              </label>
              <label className={labelCls}>
                사유 및 구체적 제안내용
                <textarea name="제안내용" rows={4} className={`${input} whitespace-pre-wrap`} />
              </label>
              <SubmitButton className={`${btn} self-start`} pendingLabel="등록 중...">등록</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-zinc-400">
              지금은 안건취합 기간이 아닙니다({roundInfo.안건취합시작일 || '제한없음'} ~ {roundInfo.안건취합마감일 || '제한없음'}).
            </p>
          )}
        </div>

        <div>
          <h2 className={h2}>제출된 안건 ({items.length}건)</h2>
          <div className="flex flex-col gap-3">
            {items.length === 0 ? (
              <div className="text-sm text-zinc-400">등록된 안건이 없습니다.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.항목명 || '(제목 없음)'}
                    </div>
                    {canEdit && (
                      <form action={deleteAgendaItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className={btnDanger}>삭제</button>
                      </form>
                    )}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {item.제안내용}
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">{item.성명} · {item.등록일시}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
