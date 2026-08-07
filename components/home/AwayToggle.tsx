'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { btnSecondary } from '@/lib/ui';
import { setAwayAction, clearAwayAction } from '@/app/(portal)/actions';

const REASONS = ['프로그램 참관', '외근(출장 등)', '내부회의'];

export default function AwayToggle({ initialAway, initialReason }: { initialAway: boolean; initialReason?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [away, setAway] = useState(initialAway);
  const [reason, setReason] = useState(initialReason ?? '');
  const [modalOpen, setModalOpen] = useState(false);
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
        setModalOpen(false);
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

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => (away ? returnToSeat() : setModalOpen(true))}
        className={
          away
            ? 'rounded-lg border border-zinc-300 bg-zinc-200 px-3 py-2 text-left text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
            : 'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
        }
      >
        {away ? `부재중 · ${reason}` : '부재중 표시'}
      </button>

      {modalOpen && (
        <Modal title="부재중 사유 선택" onClose={() => setModalOpen(false)}>
          <div className="flex flex-col gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={isPending}
                onClick={() => pickReason(r)}
                className={`${btnSecondary} justify-center`}
              >
                {r}
              </button>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
