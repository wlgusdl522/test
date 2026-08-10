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
        className="rounded-lg border border-zinc-300 bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      >
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
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {r}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
