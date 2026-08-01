'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnSecondary, input, inputBase, table, td, th, tableWrap } from '@/lib/ui';
import { submitWeeklyPlanAction } from '@/app/(portal)/weekly-plan/actions';
import { FULL_DAY_LEAVE_TYPES, LEAVE_TYPES, parseLeaveTag } from '@/lib/weeklyLeave';

type Task = { id: string; 날짜: string; 업무내용: string; 회의록후보: string };
type Row = { key: string; text: string; flagged: boolean };
type RosterMember = { email: string; name: string };
type TeamTask = { email: string; name: string; 날짜: string; 업무내용: string };

function toRows(tasks: Task[]): Row[] {
  return tasks.map((t) => ({ key: t.id, text: t.업무내용, flagged: t.회의록후보 === 'TRUE' || t.회의록후보 === 'true' }));
}

function formatMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 같은 업무내용이 여러 날 반복 체크되면 한 줄로 합쳐서 "업무내용(7/27, 7/29)"로 보여준다.
function buildMeetingSummaryLines(dayDates: string[], rowsByDay: Record<string, Row[]>): string[] {
  const datesByText = new Map<string, string[]>();
  for (const iso of dayDates) {
    for (const r of rowsByDay[iso] ?? []) {
      if (!r.flagged) continue;
      if (!datesByText.has(r.text)) datesByText.set(r.text, []);
      datesByText.get(r.text)!.push(iso);
    }
  }
  return Array.from(datesByText.entries()).map(([text, dates]) => {
    const dateLabel = [...dates].sort().map(formatMD).join(', ');
    return `${text}(${dateLabel})`;
  });
}

export default function WeeklyPlanWorkspace({
  dayDates,
  weekdayLabels,
  initialTasks,
  myName,
  myEmail,
  roster,
  teamTasks,
  teams,
  weekStart,
  viewTeam,
  isOwnTeam,
}: {
  dayDates: string[];
  weekdayLabels: string[];
  initialTasks: Task[];
  myName: string;
  myEmail: string;
  roster: RosterMember[];
  teamTasks: TeamTask[];
  teams: string[];
  weekStart: string;
  viewTeam: string;
  isOwnTeam: boolean;
}) {
  const router = useRouter();
  const [rowsByDay, setRowsByDay] = useState<Record<string, Row[]>>(() => {
    const grouped: Record<string, Row[]> = {};
    for (const iso of dayDates) grouped[iso] = toRows(initialTasks.filter((t) => t.날짜 === iso));
    return grouped;
  });
  const [draftByDay, setDraftByDay] = useState<Record<string, string>>(() =>
    Object.fromEntries(dayDates.map((iso) => [iso, '']))
  );
  const [statusText, setStatusText] = useState('');
  const [isPending, startTransition] = useTransition();

  function addRow(iso: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRowsByDay((prev) => ({ ...prev, [iso]: [...prev[iso], { key: crypto.randomUUID(), text: trimmed, flagged: false }] }));
    setDraftByDay((prev) => ({ ...prev, [iso]: '' }));
  }

  function removeRow(iso: string, key: string) {
    setRowsByDay((prev) => ({ ...prev, [iso]: prev[iso].filter((r) => r.key !== key) }));
  }

  // 같은 업무내용이 다른 날에도 있으면 하나만 눌러도 전부 같이 반영/해제된다.
  function toggleFlag(iso: string, key: string) {
    setRowsByDay((prev) => {
      const target = prev[iso]?.find((r) => r.key === key);
      if (!target) return prev;
      const nextFlagged = !target.flagged;
      const next: Record<string, Row[]> = {};
      for (const day of Object.keys(prev)) {
        next[day] = prev[day].map((r) => (r.text === target.text ? { ...r, flagged: nextFlagged } : r));
      }
      return next;
    });
  }

  function handleLeaveChange(iso: string, type: string) {
    setRowsByDay((prev) => {
      const remaining = prev[iso].filter((r) => !parseLeaveTag(r.text));
      let next: Row[];
      if (!type) next = remaining;
      else if (FULL_DAY_LEAVE_TYPES.includes(type)) next = [{ key: crypto.randomUUID(), text: `${myName}(${type})`, flagged: false }];
      else next = [{ key: crypto.randomUUID(), text: `${myName}(${type})`, flagged: false }, ...remaining];
      return { ...prev, [iso]: next };
    });
  }

  function currentLeaveValue(iso: string): string {
    const tag = (rowsByDay[iso] ?? []).map((r) => parseLeaveTag(r.text)).find(Boolean);
    return tag?.type ?? '';
  }

  function handleSubmit() {
    const payload: Record<string, { text: string; flagged: boolean }[]> = {};
    for (const iso of dayDates) payload[iso] = (rowsByDay[iso] ?? []).map((r) => ({ text: r.text, flagged: r.flagged }));
    setStatusText('제출 중...');
    startTransition(async () => {
      try {
        await submitWeeklyPlanAction(payload);
        setStatusText('제출 완료');
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '제출 실패');
      }
    });
  }

  const meetingSummaryLines = buildMeetingSummaryLines(dayDates, rowsByDay);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          업무를 입력하고 회의록에 반영할 항목은 옆의 &quot;회의록&quot; 버튼을 눌러 표시하세요. 아래 <b>제출</b> 버튼을 눌러야 저장됩니다.
        </p>
        <div className="flex flex-col mb-4">
          {dayDates.map((iso, i) => {
            const d = new Date(`${iso}T00:00:00`);
            const rows = rowsByDay[iso] ?? [];
            const leaveVal = currentLeaveValue(iso);
            const isFullDayLeave = FULL_DAY_LEAVE_TYPES.includes(leaveVal);
            return (
              <div key={iso} className="py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{weekdayLabels[i]}</span>
                  <span className="text-xs text-zinc-400">{d.getMonth() + 1}/{d.getDate()}</span>
                  <select
                    className={`${input} w-auto ml-auto text-xs`}
                    value={leaveVal}
                    onChange={(e) => handleLeaveChange(iso, e.target.value)}
                  >
                    <option value="">휴가/교육 없음</option>
                    {LEAVE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 mb-2">
                  {rows.map((r) => (
                    <div key={r.key} className="flex items-center gap-2">
                      <span className="flex-1 text-sm py-1 text-zinc-700 dark:text-zinc-300">• {r.text}</span>
                      <button
                        type="button"
                        onClick={() => toggleFlag(iso, r.key)}
                        className={`shrink-0 rounded px-2 py-1 text-[11px] border transition-colors ${
                          r.flagged
                            ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-800 dark:text-amber-400'
                            : 'border-zinc-200 text-zinc-400 hover:border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        회의록
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(iso, r.key)}
                        className="shrink-0 px-1.5 text-sm text-zinc-300 hover:text-red-500"
                        aria-label="삭제"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {!isFullDayLeave && (
                  <input
                    className={`${input} text-sm`}
                    placeholder="업무 입력 후 Enter"
                    value={draftByDay[iso] ?? ''}
                    onChange={(e) => setDraftByDay((prev) => ({ ...prev, [iso]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      addRow(iso, draftByDay[iso] ?? '');
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-500/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
              회의록 반영 예정 ({meetingSummaryLines.length}건) — 제출해야 저장됩니다.
            </span>
            <div className="flex items-center gap-2">
              {statusText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>}
              <button type="button" onClick={handleSubmit} disabled={isPending} className={btn}>
                {isPending ? '제출 중...' : '이번 주 업무 제출'}
              </button>
            </div>
          </div>
          {meetingSummaryLines.length > 0 && (
            <div className="mt-2 flex flex-col gap-0.5">
              {meetingSummaryLines.map((line) => (
                <span key={line} className="text-sm text-amber-900 dark:text-amber-300">{line}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">팀 조회 (참고용)</h3>
          <form method="get" className="flex items-center gap-1.5 ml-auto">
            <input type="hidden" name="weekStart" value={weekStart} />
            <select name="viewTeam" defaultValue={viewTeam} className={`${inputBase} w-auto text-xs py-1`}>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
          </form>
        </div>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>담당자</th>
                {dayDates.map((iso, i) => (
                  <th key={iso} className={th}>{weekdayLabels[i]} ({new Date(`${iso}T00:00:00`).getMonth() + 1}/{new Date(`${iso}T00:00:00`).getDate()})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isOwnTeam && (
                <tr className="bg-brand-tint">
                  <td className={td}><b>{myName}</b></td>
                  {dayDates.map((iso) => (
                    <td key={iso} className={td}>
                      {(rowsByDay[iso] ?? []).length === 0
                        ? <span className="text-zinc-300 dark:text-zinc-700">-</span>
                        : (rowsByDay[iso] ?? []).map((r, i) => <div key={i}>• {r.text}</div>)}
                    </td>
                  ))}
                </tr>
              )}
              {roster
                .filter((m) => !isOwnTeam || m.email.toLowerCase() !== myEmail.toLowerCase())
                .map((member) => (
                  <tr key={member.email}>
                    <td className={td}>{member.name}</td>
                    {dayDates.map((iso) => {
                      const dayTasks = teamTasks.filter((t) => t.email.toLowerCase() === member.email.toLowerCase() && t.날짜 === iso);
                      return (
                        <td key={iso} className={td}>
                          {dayTasks.length === 0
                            ? <span className="text-zinc-300 dark:text-zinc-700">-</span>
                            : dayTasks.map((t, i) => <div key={i}>• {t.업무내용}</div>)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {isOwnTeam ? '내 줄은 왼쪽 입력에 맞춰 실시간으로 바뀌고, 나머지는 이미 저장된 내용이에요.' : '다른 팀은 조회 전용이며 이미 저장된 내용만 보여줘요.'}
        </p>
      </div>
    </div>
  );
}
