'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAwayAction, clearAwayAction } from '@/app/(portal)/actions';

const REASONS = ['프로그램 참관', '외근', '내부회의'];

export default function AwayToggle({ initialAway, initialReason }: { initialAway: boolean; initialReason?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [away, setAway] = useState(initialAway);
  const [reason, setReason] = useState(initialReason ?? '');
  const [error, setError] = useState<string | null>(null);

  function pickReason(r: string) {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('reason', r);
        await setAwayAction(fd);
        setReason(r);
        setAway(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.');
      }
    });
  }

  function returnToSeat() {
    setError(null);
    startTransition(async () => {
      try {
        await clearAwayAction();
        setAway(false);
        setReason('');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.');
      }
    });
  }

  if (away) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={returnToSeat}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition-all hover:bg-amber-100 hover:border-amber-400 active:scale-98 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shadow-2xs cursor-pointer"
      >
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        부재중 · {reason} (클릭 시 복귀)
      </button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            disabled={isPending}
            onClick={() => pickReason(r)}
            className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-200 dark:hover:bg-zinc-800 shadow-2xs cursor-pointer"
          >
            {r}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
