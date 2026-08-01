'use client';

import { btn } from '@/lib/ui';

export default function VehiclesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">
        {error.message || '오류가 발생했습니다.'}
      </p>
      <button type="button" onClick={reset} className={`${btn} mt-3`}>다시 시도</button>
    </div>
  );
}
