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
  const hasAny = slide?.days.some((d) => d.items.length > 0);

  if (!slide) return null;

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-brand" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{slide.title}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="이전 슬라이드"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700 shadow-2xs"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="다음 슬라이드"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700 shadow-2xs"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? '일정 접기' : '일정 펼치기'}
            aria-expanded={open}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-slate-300 sm:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`${open ? 'block' : 'hidden'} sm:block flex-1`}>
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="overflow-x-auto">
          <div className="grid min-w-[580px] grid-cols-6 gap-2.5">
            {slide.days.map((d) => (
              <div
                key={d.iso}
                className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <p className="mb-2 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                  {d.label}
                </p>
                <div className="flex h-[180px] flex-col gap-1.5 overflow-y-auto pr-0.5 custom-scrollbar">
                  {d.items.map((it, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-1.5 text-xs text-brand-dark transition-all hover:bg-sky-100/90 dark:border-sky-900/40 dark:bg-sky-950/50 dark:text-sky-200 shadow-2xs"
                    >
                      <p className="truncate font-semibold text-[11.5px] leading-tight">{it.primary}</p>
                      {it.secondary && (
                        <p className="truncate text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {it.secondary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {!hasAny && (
          <div className="py-6 text-center">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{slide.emptyText}</p>
          </div>
        )}

        <div className="mt-4 flex justify-center items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={s.title}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === index
                  ? 'w-6 bg-brand shadow-xs'
                  : 'w-2 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

