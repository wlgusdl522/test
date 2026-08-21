'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnSecondary, card, input, label } from '@/lib/ui';
import Modal from '@/components/Modal';
import DutyCalendar, { type DutyDay } from '@/components/duty/DutyCalendar';
import StaffPicker from '@/components/duty/StaffPicker';
import DutyWeeklyLogTable, { formatDutyDayLabel } from '@/components/duty/DutyWeeklyLogTable';
import { swapDutyAssignmentAction } from '@/app/(portal)/duty/actions';
import { addDays, mondayOf, todayISO } from '@/lib/dutyDate';

type Row = Record<string, string>;
type Tab = 'calendar' | 'log';

export default function DutyClient({
  weekdayLogs,
  saturdayLogs,
  holidays,
  staff,
}: {
  weekdayLogs: Row[];
  saturdayLogs: Row[];
  holidays: { 날짜: string; 휴일명: string }[];
  staff: Row[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>('calendar');
  const [anchorDate, setAnchorDate] = useState(todayISO());
  const [swapDate, setSwapDate] = useState<string | null>(null);
  const [swapSlot, setSwapSlot] = useState<1 | 2>(1);
  const [modalError, setModalError] = useState<string | null>(null);
  const [logWeekMonday, setLogWeekMonday] = useState(mondayOf(todayISO()));

  const holidaysByDate = useMemo(() => new Map(holidays.map((h) => [h.날짜, h.휴일명])), [holidays]);

  const logsByDate = useMemo(() => {
    const m = new Map<string, DutyDay>();
    weekdayLogs.forEach((r) => m.set(r.근무일자, { kind: 'weekday', row: r }));
    saturdayLogs.forEach((r) => m.set(r.근무일자, { kind: 'saturday', row: r }));
    return m;
  }, [weekdayLogs, saturdayLogs]);

  const anchorDay = logsByDate.get(anchorDate);
  const swapDay = swapDate ? logsByDate.get(swapDate) : undefined;

  function closeModals() {
    setSwapDate(null);
    setModalError(null);
  }

  function runAction(fn: () => Promise<void>) {
    setModalError(null);
    startTransition(async () => {
      try {
        await fn();
        closeModals();
        router.refresh();
      } catch (err) {
        setModalError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.');
      }
    });
  }

  function handleSwap(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    runAction(() => swapDutyAssignmentAction(fd));
  }

  const logWeekSaturday = addDays(logWeekMonday, 5);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'calendar' ? 'bg-white text-brand shadow-sm dark:bg-zinc-900' : 'text-zinc-500'}`}
          >
            달력
          </button>
          <button
            type="button"
            onClick={() => setTab('log')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'log' ? 'bg-white text-brand shadow-sm dark:bg-zinc-900' : 'text-zinc-500'}`}
          >
            일지
          </button>
        </div>
      </div>

      {tab === 'calendar' && (
        <>
          <div className={card}>
            <DutyCalendar
              date={anchorDate}
              logsByDate={logsByDate}
              holidaysByDate={holidaysByDate}
              onSelectDate={setAnchorDate}
              onOpenSwap={(iso) => {
                if (logsByDate.has(iso)) {
                  setSwapSlot(1);
                  setSwapDate(iso);
                }
              }}
              onNavigate={setAnchorDate}
            />
          </div>

          <div className={`${card} mt-4`}>
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {anchorDate} 당직근무일지
            </p>
            {modalError && (
              <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {modalError}
              </div>
            )}

            {!anchorDay && (
              <p className="text-sm text-zinc-500">
                {holidaysByDate.has(anchorDate)
                  ? `공휴일(${holidaysByDate.get(anchorDate)})이라 당직 배정이 없습니다.`
                  : '이 날짜에는 배정된 당직자가 없습니다(일요일이거나 아직 미배정).'}
              </p>
            )}

            {anchorDay?.kind === 'weekday' && (() => {
              const row = anchorDay.row;
              return (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{row.이름} · {row.소속}</p>
                  <a href={`/duty/log/weekday/${row.id}`} className={btn}>일지 작성/보기</a>
                </div>
              );
            })()}

            {anchorDay?.kind === 'saturday' && (() => {
              const row = anchorDay.row;
              return (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {row.이름1 || '(미배정)'} · {row.소속1} / {row.이름2 || '(미배정)'} · {row.소속2}
                  </p>
                  <a href={`/duty/log/saturday/${row.id}`} className={btn}>일지 작성/보기</a>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className={card}>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setLogWeekMonday(addDays(logWeekMonday, -7))} className="text-sm text-brand hover:underline">
              ◀ 이전주
            </button>
            <span className="text-sm font-semibold">
              {formatDutyDayLabel(logWeekMonday)} ~ {formatDutyDayLabel(logWeekSaturday)}
            </span>
            <button type="button" onClick={() => setLogWeekMonday(addDays(logWeekMonday, 7))} className="text-sm text-brand hover:underline">
              다음주 ▶
            </button>
          </div>
          <DutyWeeklyLogTable monday={logWeekMonday} weekdayLogs={weekdayLogs} saturdayLogs={saturdayLogs} holidays={holidays} />
          <div className="mt-3 text-right">
            <a href={`/print/duty-log-weekly?monday=${logWeekMonday}`} target="_blank" className={btnSecondary}>
              인쇄용으로 열기
            </a>
          </div>
        </div>
      )}

      {/* 교체 모달 (더블클릭) */}
      {swapDate && swapDay && (
        <Modal title={`${swapDate} 당직 교체`} onClose={closeModals}>
          {modalError && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{modalError}</div>}
          <form onSubmit={handleSwap} className="flex flex-col gap-3">
            <input type="hidden" name="type" value={swapDay.kind} />
            <input type="hidden" name="id" value={swapDay.row.id} />
            {swapDay.kind === 'saturday' && (
              <label className={label}>
                교체할 사람
                <select value={swapSlot} onChange={(e) => setSwapSlot(Number(e.target.value) === 2 ? 2 : 1)} className={input}>
                  <option value={1}>{swapDay.row.이름1 || '(미배정)'}</option>
                  <option value={2}>{swapDay.row.이름2 || '(미배정)'}</option>
                </select>
              </label>
            )}
            <input type="hidden" name="slot" value={swapSlot} />
            <div>
              <p className={label}>새 담당자</p>
              <StaffPicker staff={staff} name="staff" required />
            </div>
            <button type="submit" disabled={isPending} className={`${btn} w-fit`}>
              {isPending ? '처리 중...' : '교체 확정'}
            </button>
          </form>
        </Modal>
      )}

    </div>
  );
}
