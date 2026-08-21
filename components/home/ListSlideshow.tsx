'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

type ListItem = { title: string; meta?: string; group?: string; href?: string };
type GridItem = { primary: string; secondary?: string; highlight?: boolean };
type SplitPane = { title: string; emptyText: string; items: ListItem[]; viewAllHref?: string };

type ListSlideBase = { title: string; emptyText: string };
export type ListSlide =
  | (ListSlideBase & { kind?: 'list'; items: ListItem[]; viewAllHref?: string })
  | (ListSlideBase & { kind: 'grid'; columns: string[]; rows: { label: string; cells: GridItem[][] }[]; rowHeight?: number })
  | (ListSlideBase & { kind: 'split'; left: SplitPane; right: SplitPane });

function ListItemRow({ item }: { item: ListItem }) {
  const row = (
    <div className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60">
      <span className="min-w-0 font-medium text-slate-800 dark:text-slate-200 group-hover:text-brand transition-colors">
        {item.title}
      </span>
      {item.meta && (
        <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
          {item.meta}
        </span>
      )}
    </div>
  );
  return item.href ? (
    <Link href={item.href} className="block">
      {row}
    </Link>
  ) : (
    row
  );
}

function SplitPaneView({ pane }: { pane: SplitPane }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {pane.title}
          {pane.items.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10.5px] font-bold text-slate-500 dark:bg-zinc-800 dark:text-slate-400">
              {pane.items.length}
            </span>
          )}
        </h4>
        {pane.viewAllHref && (
          <Link href={pane.viewAllHref} className="text-[11px] font-bold text-brand hover:underline">
            전체보기 →
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {pane.items.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
            <p className="text-center text-xs text-slate-400">{pane.emptyText}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {pane.items.map((item, i) => (
              <li key={i}>
                <ListItemRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const PANEL_HEIGHT = 'min-h-[380px] max-h-[460px]';

export default function ListSlideshow({ slides }: { slides: ListSlide[] }) {
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
  if (!slide) return null;

  const isEmpty =
    slide.kind === 'grid'
      ? !slide.rows.some((r) => r.cells.some((c) => c.length > 0))
      : slide.kind === 'split'
        ? false
        : slide.items.length === 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-brand" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {slide.title}
            {slide.kind !== 'grid' && slide.kind !== 'split' && slide.items.length > 0 && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-zinc-800 dark:text-slate-300">
                {slide.items.length}
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {slide.kind !== 'grid' && slide.kind !== 'split' && slide.viewAllHref && (
            <Link href={slide.viewAllHref} className="text-xs font-bold text-brand hover:underline">
              전체보기 →
            </Link>
          )}
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
              aria-label={open ? '목록 접기' : '목록 펼치기'}
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
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`${PANEL_HEIGHT} ${open ? 'block' : 'hidden'} overflow-y-auto sm:block custom-scrollbar`}
      >
        {isEmpty ? (
          <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
            <p className="text-center text-xs font-medium text-slate-400">{slide.emptyText}</p>
          </div>
        ) : slide.kind === 'grid' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-zinc-800/40">
                  <th className="w-24 border border-slate-200/80 p-2 font-bold text-slate-500 dark:border-zinc-800" />
                  {slide.columns.map((c) => (
                    <th key={c} className="border border-slate-200/80 p-2 text-left font-bold text-slate-600 dark:border-zinc-800 dark:text-slate-300">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slide.rows.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="whitespace-nowrap border border-slate-200/80 p-2 align-top font-bold text-slate-600 dark:border-zinc-800 dark:text-slate-400 bg-slate-50/40 dark:bg-zinc-900/40">
                      {row.label}
                    </td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className="border border-slate-200/80 align-top p-1.5 dark:border-zinc-800">
                        <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar" style={{ height: slide.rowHeight ?? 65 }}>
                          {cell.map((it, i) => (
                            <div
                              key={i}
                              className={`rounded-lg border px-2 py-1 leading-tight shadow-2xs ${
                                it.highlight
                                  ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border-sky-100 bg-sky-50 text-brand-dark dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300'
                              }`}
                            >
                              <p className="truncate font-semibold text-[11.5px]">{it.primary}</p>
                              {it.secondary && (
                                <p className="truncate text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {it.secondary}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : slide.kind === 'split' ? (
          <div className="grid h-full grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="border-b border-slate-100 pb-4 dark:border-zinc-800 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
              <SplitPaneView pane={slide.left} />
            </div>
            <SplitPaneView pane={slide.right} />
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {slide.items.slice(0, 8).map((item, i, arr) => (
              <li key={i}>
                {item.group && item.group !== arr[i - 1]?.group && (
                  <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 first:pt-0">
                    {item.group}
                  </p>
                )}
                <ListItemRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>

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
  );
}

