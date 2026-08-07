'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnSecondary, card, input, label } from '@/lib/ui';
import Modal from '@/components/Modal';
import SignaturePad from '@/components/duty/SignaturePad';
import DutyCalendar, { type DutyDay } from '@/components/duty/DutyCalendar';
import StaffPicker from '@/components/duty/StaffPicker';
import DutyWeeklyLogTable, { formatDutyDayLabel } from '@/components/duty/DutyWeeklyLogTable';
import { swapDutyAssignmentAction } from '@/app/(portal)/duty/actions';
import { saveDutySaturdaySignatureAction, saveDutyWeekdayLogAction } from '@/app/(portal)/duty/log/[type]/[id]/actions';
import { addDays, mondayOf, todayISO } from '@/lib/dutyDate';

type Row = Record<string, string>;
type Tab = 'calendar' | 'log';

const CHECK_FIELDS = [
  { key: '실별소등확인', reasonKey: '사유', label: '실별 소등 확인' },
  { key: '창문닫기', reasonKey: '사유2', label: '창문닫기' },
  { key: '출입문잠금', reasonKey: '사유3', label: '출입문잠금' },
];

const TEXT_FIELDS = [
  { key: '전화민원내용', label: '전화/민원 내용' },
  { key: '내방객및내방이유', label: '내방객 및 내방이유' },
  { key: '응급및비상시특이사항', label: '응급 및 비상시 특이사항' },
  { key: '퇴근전특근자성명', label: '당직자 퇴근전 특근자 성명' },
  { key: '최종인계자', label: '최종인계자' },
];

export default function DutyClient({
  weekdayLogs,
  saturdayLogs,
  holidays,
  staff,
  viewerEmail,
  isAdmin,
}: {
  weekdayLogs: Row[];
  saturdayLogs: Row[];
  holidays: { 날짜: string; 휴일명: string }[];
  staff: Row[];
  viewerEmail: string;
  isAdmin: boolean;
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

  function handleSaveWeekday(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    runAction(() => saveDutyWeekdayLogAction(fd));
  }

  function handleSaveSaturdaySignature(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    runAction(() => saveDutySaturdaySignatureAction(fd));
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
              const isOwner = isAdmin || (row.이메일 ?? '').toLowerCase() === viewerEmail;
              return (
                <div>
                  <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{row.이름} · {row.소속}</p>
                  {isOwner ? (
                    <form onSubmit={handleSaveWeekday} className="grid grid-cols-2 gap-3">
                      <input type="hidden" name="id" value={row.id} />
                      {CHECK_FIELDS.map((f) => (
                        <div key={f.key} className="col-span-2 grid grid-cols-2 gap-3">
                          <label className={label}>
                            {f.label}
                            <input name={f.key} defaultValue={row[f.key] || '이상없음'} className={input} />
                          </label>
                          <label className={label}>
                            사유(이상 있을 때만)
                            <input name={f.reasonKey} defaultValue={row[f.reasonKey]} className={input} />
                          </label>
                        </div>
                      ))}
                      {TEXT_FIELDS.map((f) => (
                        <label key={f.key} className={`${label} col-span-2`}>
                          {f.label}
                          <input name={f.key} defaultValue={row[f.key]} className={input} />
                        </label>
                      ))}
                      <div className="col-span-2">
                        <p className={label}>서명</p>
                        <SignaturePad name="signature" hasExisting={!!row.사인} />
                      </div>
                      <div className="col-span-2">
                        <button type="submit" disabled={isPending} className={btn}>
                          {isPending ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-2 text-sm">
                      {[...CHECK_FIELDS.map((f) => ({ label: f.label, value: row[f.key] })), ...TEXT_FIELDS.map((f) => ({ label: f.label, value: row[f.key] }))].map((f) => (
                        <div key={f.label}>
                          <span className="text-zinc-400">{f.label}: </span>
                          <span className="text-zinc-800 dark:text-zinc-100">{f.value || '-'}</span>
                        </div>
                      ))}
                      <p className="text-xs text-zinc-400">본인이 배정된 당직만 작성할 수 있습니다.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {anchorDay?.kind === 'saturday' && (() => {
              const row = anchorDay.row;
              const slots = [
                { slot: 1 as const, email: row.이메일1, name: row.이름1, team: row.소속1, sign: row.사인1 },
                { slot: 2 as const, email: row.이메일2, name: row.이름2, team: row.소속2, sign: row.사인2 },
              ];
              return (
                <div className="grid grid-cols-2 gap-4">
                  {slots.map((s) => {
                    const isOwner = isAdmin || (s.email ?? '').toLowerCase() === viewerEmail;
                    return (
                      <div key={s.slot}>
                        <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {s.name || '(미배정)'} · {s.team}
                        </p>
                        {isOwner ? (
                          <form onSubmit={handleSaveSaturdaySignature} className="flex flex-col gap-2">
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="slot" value={s.slot} />
                            <SignaturePad name="signature" hasExisting={!!s.sign} />
                            <button type="submit" disabled={isPending} className={`${btn} w-fit`}>
                              {isPending ? '저장 중...' : '서명 저장'}
                            </button>
                          </form>
                        ) : (
                          <p className="text-sm text-zinc-400">{s.sign ? '서명 완료' : '서명 없음'}</p>
                        )}
                      </div>
                    );
                  })}
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
