// 반복되는 Tailwind 클래스 조합을 한 곳에 모아 화면마다 일관된 스타일을 쉽게 재사용한다.

export const page = 'p-8 max-w-4xl mx-auto';
export const pageWide = 'p-8 max-w-6xl mx-auto';

export const pageHeader = 'flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800';
export const h1 = 'text-[22px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100';
export const h2 = 'text-[13px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3 mt-2';
export const hint = 'text-[13px] text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed';

export const card =
  'border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 mb-7 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)]';

export const statCard =
  'flex-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] border-l-4 border-l-brand transition-shadow hover:shadow-md';

export const input =
  'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand';

export const label = 'flex flex-col gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400';

export const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark active:scale-[0.98]';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm transition-colors hover:bg-zinc-50 hover:border-zinc-400 dark:hover:bg-zinc-800';

export const btnDanger =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 shadow-sm transition-colors hover:bg-red-50 dark:hover:bg-red-950/40';

export const tableWrap = 'overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)]';
export const table = 'w-full border-collapse text-sm';
export const th = 'text-left bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 font-semibold text-[12.5px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap';
export const td = 'border-b border-zinc-100 dark:border-zinc-900 py-2.5 px-3.5 text-zinc-800 dark:text-zinc-200 whitespace-nowrap';
export const trHover = 'transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40';

// 상태값(결재상태/재직상태 등)에 색상 의미를 부여하는 배지. lib/badge.ts의 statusTone()과 함께 쓴다.
export const badgeBase = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
export const badgeTone = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  gray: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
} as const;
