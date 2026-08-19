'use client';

import { Fragment, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { badgeBase, badgeTone, btn, btnSecondary, cardTableWrap, input, inputBase, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { submitWeeklyPlanAction } from '@/app/(portal)/weekly-plan/actions';
import { FULL_DAY_LEAVE_TYPES, LEAVE_TYPES, parseLeaveTag } from '@/lib/weeklyLeave';
import { buildGroupedRoster, type WeeklyPlanGroupRow } from '@/lib/weeklyPlanGroup';

type Task = { id: string; 날짜: string; 업무내용: string; 회의록후보: string };
type Row = { key: string; text: string; flagged: boolean };
type RosterMember = { email: string; name: string; 담당사업: string };
type TeamTask = { email: string; name: string; 날짜: string; 업무내용: string };

// 그룹으로 합쳐진 줄은 멤버들의 담당사업(직원관리에서 고정 관리)을 " / "로 이어 보여준다 — 겹치는 값은 하나만 남긴다.
function groupBusinessLabel(emails: string[], rosterByEmail: Map<string, RosterMember>): string {
  const names = emails
    .map((e) => rosterByEmail.get(e.toLowerCase())?.담당사업.trim())
    .filter((v): v is string => !!v);
  return Array.from(new Set(names)).join(' / ');
}

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
  groupRows,
  myBusinessName,
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
  groupRows: WeeklyPlanGroupRow[];
  myBusinessName: string;
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
  const [mobileTab, setMobileTab] = useState<'write' | 'team'>('write');

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
    // Enter를 안 치고 바로 제출을 눌러도, 아직 입력창에 남아있는 텍스트를 놓치지 않고 같이 담는다.
    const payload: Record<string, { text: string; flagged: boolean }[]> = {};
    for (const iso of dayDates) {
      const rows = (rowsByDay[iso] ?? []).map((r) => ({ text: r.text, flagged: r.flagged }));
      const leftover = (draftByDay[iso] ?? '').trim();
      payload[iso] = leftover ? [...rows, { text: leftover, flagged: false }] : rows;
    }
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
  const visibleRoster = roster.filter((m) => !isOwnTeam || m.email.toLowerCase() !== myEmail.toLowerCase());
  const groupedRows = buildGroupedRoster(visibleRoster, groupRows);
  const rosterByEmail = new Map(roster.map((m) => [m.email.toLowerCase(), m]));

  function mobileTabClass(active: boolean) {
    return `-mb-px rounded-t-md border border-b-0 px-3.5 py-2 text-sm transition-colors ${
      active
        ? 'border-zinc-200 bg-white font-medium text-brand dark:border-zinc-800 dark:bg-zinc-900'
        : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
    }`;
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800 lg:hidden">
        <button type="button" onClick={() => setMobileTab('write')} className={mobileTabClass(mobileTab === 'write')}>
          내 업무 입력
        </button>
        <button type="button" onClick={() => setMobileTab('team')} className={mobileTabClass(mobileTab === 'team')}>
          팀 조회
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className={`${mobileTab === 'write' ? 'block' : 'hidden'} lg:block`}>
        <div className="flex flex-col mb-4 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {dayDates.map((iso, i) => {
            const d = new Date(`${iso}T00:00:00`);
            const rows = rowsByDay[iso] ?? [];
            const leaveVal = currentLeaveValue(iso);
            const isFullDayLeave = FULL_DAY_LEAVE_TYPES.includes(leaveVal);
            return (
              <div key={iso} className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 odd:bg-zinc-50/60 dark:odd:bg-zinc-900/40">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="inline-flex items-center justify-center rounded-md bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand-dark dark:text-brand">
                    {weekdayLabels[i]} {d.getMonth() + 1}/{d.getDate()}
                  </span>
                  <select
                    className={`${input} w-auto ml-auto text-xs py-1`}
                    value={leaveVal}
                    onChange={(e) => handleLeaveChange(iso, e.target.value)}
                  >
                    <option value="">휴가/교육 없음</option>
                    {LEAVE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {rows.length > 0 && (
                  <div className="flex flex-col gap-1 mb-2">
                    {rows.map((r) => (
                      <div key={r.key} className="flex items-center gap-2">
                        <span className="flex-1 text-sm py-1 text-zinc-700 dark:text-zinc-300">{r.text}</span>
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
                )}

                {!isFullDayLeave && (
                  <input
                    className={`${input} text-sm`}
                    placeholder="업무 입력"
                    value={draftByDay[iso] ?? ''}
                    onChange={(e) => setDraftByDay((prev) => ({ ...prev, [iso]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      addRow(iso, draftByDay[iso] ?? '');
                    }}
                    onBlur={(e) => addRow(iso, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <span className={`${badgeBase} ${badgeTone.amber}`}>회의록 반영 {meetingSummaryLines.length}건</span>
            <div className="flex items-center gap-2">
              {statusText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>}
              <button type="button" onClick={handleSubmit} disabled={isPending} className={btn}>
                {isPending ? '제출 중...' : '이번 주 업무 제출'}
              </button>
            </div>
          </div>
          {meetingSummaryLines.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-0.5 border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
              {meetingSummaryLines.map((line) => (
                <span key={line} className="text-sm text-zinc-600 dark:text-zinc-400">{line}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${mobileTab === 'team' ? 'block' : 'hidden'} lg:block`}>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">팀 조회</h3>
          <form method="get" className="flex items-center gap-1.5 ml-auto">
            <input type="hidden" name="weekStart" value={weekStart} />
            <select name="viewTeam" defaultValue={viewTeam} className={`${inputBase} w-auto text-xs py-1`}>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
          </form>
        </div>
        {/* 모바일: 7열 표는 너무 좁아져서 담당자별 카드로, 카드 안에서 날짜별로 나열 */}
        <div className="flex flex-col gap-2 sm:hidden">
          {isOwnTeam && (
            <div className="rounded-lg border border-brand bg-brand-tint p-3">
              <p className="text-sm font-semibold text-brand-dark dark:text-brand">{myName}</p>
              {myBusinessName && <p className="text-xs text-zinc-500 dark:text-zinc-400">{myBusinessName}</p>}
              <div className="mt-1.5 flex flex-col gap-1.5">
                {dayDates.map((iso, i) => {
                  const dayRows = rowsByDay[iso] ?? [];
                  if (dayRows.length === 0) return null;
                  return (
                    <div key={iso}>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {weekdayLabels[i]} ({new Date(`${iso}T00:00:00`).getMonth() + 1}/{new Date(`${iso}T00:00:00`).getDate()})
                      </span>
                      {dayRows.map((r, i) => <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300">• {r.text}</div>)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {groupedRows.map((row) => {
              const rowEmails = new Set(row.emails.map((e) => e.toLowerCase()));
              const memberTasks = teamTasks.filter((t) => rowEmails.has(t.email.toLowerCase()));
              const rowBusinessLabel = groupBusinessLabel(row.emails, rosterByEmail);
              return (
                <div key={row.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.label}</p>
                  {rowBusinessLabel && <p className="text-xs text-zinc-500 dark:text-zinc-400">{rowBusinessLabel}</p>}
                  {memberTasks.length === 0 ? (
                    <p className="mt-1 text-sm text-zinc-300 dark:text-zinc-700">등록된 업무 없음</p>
                  ) : (
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      {dayDates.map((iso, i) => {
                        const dayTasks = memberTasks.filter((t) => t.날짜 === iso);
                        if (dayTasks.length === 0) return null;
                        return (
                          <div key={iso}>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {weekdayLabels[i]} ({new Date(`${iso}T00:00:00`).getMonth() + 1}/{new Date(`${iso}T00:00:00`).getDate()})
                            </span>
                            {dayTasks.map((t, i) => <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300">• {t.업무내용}</div>)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* 데스크톱: 기존 표 레이아웃 유지 */}
        <div className={`hidden sm:block ${cardTableWrap}`}>
          <table className={tableClean}>
            <thead>
              <tr>
                <th className={thClean}>담당자</th>
                {dayDates.map((iso, i) => (
                  <th key={iso} className={thClean}>{weekdayLabels[i]} ({new Date(`${iso}T00:00:00`).getMonth() + 1}/{new Date(`${iso}T00:00:00`).getDate()})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isOwnTeam && (
                <>
                  <tr className="bg-brand-tint">
                    <td className={tdClean}><b>{myName}</b></td>
                    {dayDates.map((iso) => (
                      <td key={iso} className={tdClean}>
                        {(rowsByDay[iso] ?? []).length === 0
                          ? <span className="text-zinc-300 dark:text-zinc-700">-</span>
                          : (rowsByDay[iso] ?? []).map((r, i) => <div key={i}>• {r.text}</div>)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-brand-tint">
                    <td className={tdClean} colSpan={1 + dayDates.length}>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {myBusinessName || '사업명 미입력'}
                      </span>
                    </td>
                  </tr>
                </>
              )}
              {groupedRows.map((row) => {
                const rowEmails = new Set(row.emails.map((e) => e.toLowerCase()));
                const rowBusinessLabel = groupBusinessLabel(row.emails, rosterByEmail);
                return (
                  <Fragment key={row.key}>
                    <tr className={trHoverClean}>
                      <td className={tdClean}>{row.label}</td>
                      {dayDates.map((iso) => {
                        const dayTasks = teamTasks.filter((t) => rowEmails.has(t.email.toLowerCase()) && t.날짜 === iso);
                        return (
                          <td key={iso} className={tdClean}>
                            {dayTasks.length === 0
                              ? <span className="text-zinc-300 dark:text-zinc-700">-</span>
                              : dayTasks.map((t, i) => <div key={i}>• {t.업무내용}</div>)}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className={trHoverClean}>
                      <td className={tdClean} colSpan={1 + dayDates.length}>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {rowBusinessLabel || '사업명 미입력'}
                        </span>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
