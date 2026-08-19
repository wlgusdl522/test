'use client';

import { useRef, useState } from 'react';

type DayItem = { primary: string; secondary?: string };
type Day = { iso: string; label: string; items: DayItem[] };
export type ScheduleSlide = { title: string; emptyText: string; days: Day[] };

export default function ScheduleSlideshow({ slides }: { slides: ScheduleSlide[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  function go(delta: number) {
    setIndex((i) => (i + delta + slides.length) % slides.length);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) go(delta > 0 ? -1 : 1);
    touchStartX.current = null;
  }

  const slide = slides[index];
  const hasAny = slide.days.some((d) => d.items.length > 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{slide.title}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="이전 슬라이드"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="다음 슬라이드"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? '일정 접기' : '일정 펼치기'}
            aria-expanded={open}
            className="ml-1 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`${open ? 'block' : 'hidden'} sm:block`}>
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-6 gap-2">
            {slide.days.map((d) => (
              <div key={d.iso} className="rounded-lg border border-zinc-100 p-2 dark:border-zinc-800">
                <p className="mb-1.5 text-[11px] font-medium text-zinc-400">{d.label}</p>
                <div className="flex h-[160px] flex-col gap-1 overflow-y-auto">
                  {d.items.map((it, i) => (
                    <div
                      key={i}
                      className="rounded bg-brand-tint px-1.5 py-1 text-[11px] leading-tight text-brand-dark dark:bg-brand-tint/20 dark:text-brand"
                    >
                      <p className="truncate font-medium">{it.primary}</p>
                      {it.secondary && <p className="truncate text-zinc-500 dark:text-zinc-400">{it.secondary}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {!hasAny && <p className="mt-3 text-center text-xs text-zinc-400">{slide.emptyText}</p>}

        <div className="mt-3 flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={s.title}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-brand' : 'w-1.5 bg-zinc-200 dark:bg-zinc-700'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
