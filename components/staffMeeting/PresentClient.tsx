'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnSecondary } from '@/lib/ui';

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);

// 표지 + 팀별(사업구분 개수에 따라 자동 분할된) 페이지를 실제 프레젠테이션 슬라이드쇼처럼
// 전체화면으로 보여주고, 발표 포인터가 흔히 보내는 방향키/페이지업다운으로 넘길 수 있게 한다.
export default function PresentClient({ pages, ym }: { pages: React.ReactNode[]; ym: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => Math.min(pages.length - 1, i + 1)), [pages.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    containerRef.current?.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (NEXT_KEYS.has(e.key)) {
        e.preventDefault();
        next();
      } else if (PREV_KEYS.has(e.key)) {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, prev]);

  function handleClose() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    router.push(`/staff-meeting?ym=${ym}`);
  }

  if (pages.length === 0) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950">
      <div className="flex justify-end p-3">
        <button type="button" onClick={handleClose} className={btnSecondary}>닫기</button>
      </div>
      <div className="flex-1 overflow-auto px-10">{pages[index]}</div>
      <div className="flex items-center justify-center gap-3 p-4">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className={`${btnSecondary} disabled:opacity-30`}
        >
          ← 이전
        </button>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{index + 1} / {pages.length}</span>
        <button
          type="button"
          onClick={next}
          disabled={index === pages.length - 1}
          className={`${btn} disabled:opacity-30`}
        >
          다음 →
        </button>
      </div>
    </div>
  );
}
