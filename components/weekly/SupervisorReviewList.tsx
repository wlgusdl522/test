'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn } from '@/lib/ui';
import { submitSupervisorReflectionsAction } from '@/app/(portal)/weekly-plan/actions';

type ReviewTask = { id: string; 날짜: string; 성명: string; 업무내용: string; highlighted: boolean; reflected: boolean };

function formatMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SupervisorReviewList({ tasks }: { tasks: ReviewTask[] }) {
  const router = useRouter();
  const [reflectedById, setReflectedById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tasks.map((t) => [t.id, t.reflected]))
  );
  const [statusText, setStatusText] = useState('');
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setReflectedById((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSubmit() {
    const changes = tasks
      .filter((t) => reflectedById[t.id] !== t.reflected)
      .map((t) => ({ id: t.id, flagged: reflectedById[t.id] }));
    if (changes.length === 0) {
      setStatusText('변경된 항목이 없습니다.');
      return;
    }
    setStatusText('반영 중...');
    startTransition(async () => {
      try {
        await submitSupervisorReflectionsAction(changes);
        setStatusText('반영 완료');
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '반영 실패');
      }
    });
  }

  const reflectedTasks = tasks.filter((t) => reflectedById[t.id]);

  return (
    <div>
      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4">해당 주에 등록된 업무가 없습니다.</p>
      ) : (
        <div className="flex flex-col mb-4">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
              <span className="w-16 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{t.성명}</span>
              <span className="w-12 shrink-0 text-xs text-zinc-400">{formatMD(t.날짜)}</span>
              <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                {t.업무내용}
                {t.highlighted && <span className="ml-1.5 text-xs text-brand">(회의록 반영됨)</span>}
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

      <div className="rounded-lg border border-brand-tint bg-brand-tint px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-brand">
            부서장 주간업무계획 반영 예정 ({reflectedTasks.length}건) — 반영 버튼을 눌러야 저장됩니다.
          </span>
          <div className="flex items-center gap-2">
            {statusText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>}
            <button type="button" onClick={handleSubmit} disabled={isPending} className={btn}>
              {isPending ? '반영 중...' : '부서장 주간업무계획에 반영'}
            </button>
          </div>
        </div>
        {reflectedTasks.length > 0 && (
          <div className="mt-2 flex flex-col gap-0.5">
            {reflectedTasks.map((t) => (
              <span key={t.id} className="text-sm text-brand-dark dark:text-brand">
                {t.성명} · {formatMD(t.날짜)} · {t.업무내용}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
