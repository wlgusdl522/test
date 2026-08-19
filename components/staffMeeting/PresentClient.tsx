'use client';

import { useState } from 'react';
import { btn, btnSecondary } from '@/lib/ui';

// 표지 + 팀별(사업구분 개수에 따라 자동 분할된) 페이지를 구글슬라이드처럼 한 장씩 넘겨 보여준다.
export default function PresentClient({ pages }: { pages: React.ReactNode[] }) {
  const [index, setIndex] = useState(0);

  if (pages.length === 0) return null;

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex-1">{pages[index]}</div>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className={`${btnSecondary} disabled:opacity-30`}
        >
          ← 이전
        </button>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{index + 1} / {pages.length}</span>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          disabled={index === pages.length - 1}
          className={`${btn} disabled:opacity-30`}
        >
          다음 →
        </button>
      </div>
    </div>
  );
}
