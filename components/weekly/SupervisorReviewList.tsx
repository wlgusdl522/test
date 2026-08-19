'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { badgeBase, badgeTone, btn, cardTableWrap, tableClean, tdClean, thClean } from '@/lib/ui';
import { submitSupervisorReflectionsAction } from '@/app/(portal)/weekly-plan/actions';

type ReviewTask = { id: string; 날짜: string; 성명: string; 업무내용: string; highlighted: boolean; reflected: boolean };

function formatMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SupervisorReviewList({
  tasks,
  dayDates,
  weekdayLabels,
  team,
  weekStart,
}: {
  tasks: ReviewTask[];
  dayDates: string[];
  weekdayLabels: string[];
  team: string;
  weekStart: string;
}) {
  const router = useRouter();
  const [reflectedById, setReflectedById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tasks.map((t) => [t.id, t.reflected]))
  );
  const [statusText, setStatusText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [mobileTab, setMobileTab] = useState<'review' | 'preview'>('review');

  function toggle(id: string) {
    setReflectedById((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSubmit() {
    const changes = tasks
      .filter((t) => reflectedById[t.id] !== t.reflected)
      .map((t) => ({ id: t.id, flagged: reflectedById[t.id] }));
    setStatusText('반영 중...');
    startTransition(async () => {
      try {
        await submitSupervisorReflectionsAction(team, weekStart, changes);
        setStatusText('반영 완료 (완료 처리됨)');
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '반영 실패');
      }
    });
  }

  const reflectedTasks = tasks.filter((t) => reflectedById[t.id]);

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
        <button type="button" onClick={() => setMobileTab('review')} className={mobileTabClass(mobileTab === 'review')}>
          업무 확인
        </button>
        <button type="button" onClick={() => setMobileTab('preview')} className={mobileTabClass(mobileTab === 'preview')}>
          반영 미리보기
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className={`${mobileTab === 'review' ? 'block' : 'hidden'} lg:block`}>
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4">해당 주에 등록된 업무가 없습니다.</p>
        ) : (
          <div className="flex flex-col mb-4 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 odd:bg-zinc-50/60 dark:odd:bg-zinc-900/40">
                <span className="w-16 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{t.성명}</span>
                <span className="w-12 shrink-0 text-xs text-zinc-400">{formatMD(t.날짜)}</span>
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {t.업무내용}
                  {t.highlighted && <span className={`${badgeBase} ${badgeTone.amber} ml-1.5 py-0`}>회의록</span>}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`shrink-0 rounded px-2.5 py-1 text-[11px] border transition-colors ${
                    reflectedById[t.id]
                      ? 'bg-brand-tint border-brand text-brand'
                      : 'border-zinc-200 text-zinc-400 hover:border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  ✓ 반영
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <span className={`${badgeBase} ${badgeTone.blue}`}>반영 예정 {reflectedTasks.length}건</span>
            <div className="flex items-center gap-2">
              {statusText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>}
              <button type="button" onClick={handleSubmit} disabled={isPending} className={btn}>
                {isPending ? '반영 중...' : '부서장 주간업무계획에 반영'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`${mobileTab === 'preview' ? 'block' : 'hidden'} lg:block`}>
        <h3 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-200">반영 미리보기</h3>

        {/* 모바일: 6열 표 대신 날짜별 카드로 나열 */}
        <div className="flex flex-col gap-2 sm:hidden">
          {dayDates.map((iso, i) => {
            const dayTasks = reflectedTasks.filter((t) => t.날짜 === iso);
            return (
              <div key={iso} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{weekdayLabels[i]} ({formatMD(iso)})</p>
                {dayTasks.length === 0 ? (
                  <p className="mt-1 text-sm text-zinc-300 dark:text-zinc-700">-</p>
                ) : (
                  dayTasks.map((t) => (
                    <div key={t.id} className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">• {t.성명}: {t.업무내용}</div>
                  ))
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
                {dayDates.map((iso, i) => (
                  <th key={iso} className={thClean}>{weekdayLabels[i]} ({formatMD(iso)})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {dayDates.map((iso) => {
                  const dayTasks = reflectedTasks.filter((t) => t.날짜 === iso);
                  return (
                    <td key={iso} className={`${tdClean} align-top`}>
                      {dayTasks.length === 0
                        ? <span className="text-zinc-300 dark:text-zinc-700">-</span>
                        : dayTasks.map((t) => <div key={t.id}>• {t.성명}: {t.업무내용}</div>)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
