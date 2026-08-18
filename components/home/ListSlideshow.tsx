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
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">{item.title}</span>
      {item.meta && <span className="shrink-0 text-xs text-zinc-400">{item.meta}</span>}
    </div>
  );
  return item.href ? (
    <Link href={item.href} className="-mx-1 block rounded px-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
      {row}
    </Link>
  ) : (
    row
  );
}

function SplitPaneView({ pane }: { pane: SplitPane }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          {pane.title}
          {pane.items.length > 0 && <span className="text-zinc-400"> ({pane.items.length})</span>}
        </h4>
        {pane.viewAllHref && (
          <Link href={pane.viewAllHref} className="text-[11px] text-brand hover:underline">전체보기 →</Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {pane.items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-xs text-zinc-400">{pane.emptyText}</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
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

// 리스트/그리드 슬라이드 중 어느 게 나와도 패널 높이가 안 흔들리도록 모든 슬라이드가 이 높이를 공유한다
// (그리드가 요일 6줄로 가장 길어서, 여기 맞춰 리스트 쪽은 아래 여백이 남는 식).
const PANEL_HEIGHT = 'h-[420px]';

export default function ListSlideshow({ slides }: { slides: ListSlide[] }) {
  const [index, setIndex] = useState(0);
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
  const isEmpty =
    slide.kind === 'grid'
      ? !slide.rows.some((r) => r.cells.some((c) => c.length > 0))
      : slide.kind === 'split'
        ? false // 스플릿은 각 패널이 자기 emptyText를 알아서 보여준다
        : slide.items.length === 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {slide.title}
          {slide.kind !== 'grid' && slide.kind !== 'split' && slide.items.length > 0 && (
            <span className="text-zinc-400"> ({slide.items.length})</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {slide.kind !== 'grid' && slide.kind !== 'split' && slide.viewAllHref && (
            <Link href={slide.viewAllHref} className="text-xs text-brand hover:underline">전체보기 →</Link>
          )}
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
          </div>
        </div>
      </div>

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className={`${PANEL_HEIGHT} overflow-y-auto`}>
        {isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-zinc-400">{slide.emptyText}</p>
          </div>
        ) : slide.kind === 'grid' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="w-20 border border-zinc-100 dark:border-zinc-800" />
                  {slide.columns.map((c) => (
                    <th key={c} className="border border-zinc-100 p-1 text-left font-medium text-zinc-400 dark:border-zinc-800">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slide.rows.map((row) => (
                  <tr key={row.label}>
                    <td className="whitespace-nowrap border border-zinc-100 p-1 align-top font-medium text-zinc-400 dark:border-zinc-800">{row.label}</td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className="border border-zinc-100 align-top p-1 dark:border-zinc-800">
                        <div className="flex flex-col gap-1 overflow-y-auto" style={{ height: slide.rowHeight ?? 60 }}>
                          {cell.map((it, i) => (
                            <div
                              key={i}
                              className={`rounded px-1.5 py-1 leading-tight ${
                                it.highlight
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400'
                                  : 'bg-brand-tint text-brand-dark dark:bg-brand-tint/20 dark:text-brand'
                              }`}
                            >
                              <p className="truncate font-medium">{it.primary}</p>
                              {it.secondary && <p className="truncate text-zinc-500 dark:text-zinc-400">{it.secondary}</p>}
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
          <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
              <SplitPaneView pane={slide.left} />
            </div>
            <SplitPaneView pane={slide.right} />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {slide.items.slice(0, 6).map((item, i, arr) => (
              <li key={i}>
                {item.group && item.group !== arr[i - 1]?.group && (
                  <p className="pt-2 text-[11px] font-semibold text-zinc-400 first:pt-0">{item.group}</p>
                )}
                <ListItemRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>

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
  );
}
