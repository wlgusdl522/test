// 반복되는 Tailwind 클래스 조합을 한 곳에 모아 화면마다 일관된 스타일을 쉽게 재사용한다.
// 값들은 원래 Index.html(Apps Script 앱)의 CSS를 그대로 참고해서 맞췄다 — 카드 그림자, 표 줄무늬,
// 결재라인 하이라이트 등 원본 앱의 느낌을 유지하는 것이 목적.

export const page = 'p-8 max-w-4xl mx-auto';
export const pageWide = 'p-8 max-w-6xl mx-auto';

export const pageHeader = 'flex items-center justify-between mb-5 flex-wrap gap-3';
export const h1 = 'text-[20px] font-semibold text-brand-dark dark:text-brand m-0';
export const h2 = 'text-[13px] font-bold text-brand-dark dark:text-brand mt-[22px] mb-2.5 pb-1.5 border-b border-zinc-100 dark:border-zinc-800 first:mt-0';
export const hint = 'text-[13px] text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed';

export const card =
  'rounded-lg bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.08)] p-5 mb-5';

export const statCard =
  'flex-1 rounded-lg bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] border-l-[3px] border-l-brand transition-shadow hover:shadow-md';

export const input =
  'w-full rounded-md border border-[#dadce0] dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-tint';

export const label = 'flex flex-col gap-1 text-[12.5px] text-zinc-500 dark:text-zinc-400';

export const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand-dark';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1 rounded-md bg-[#eef1f6] dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 transition-colors hover:bg-[#e3e7ee] dark:hover:bg-zinc-700';

export const btnDanger =
  'inline-flex items-center justify-center gap-1 rounded-md bg-[#eef1f6] dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-[#b51c31] dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40';

export const tableWrap = 'overflow-x-auto rounded-md border border-[#d7dbe0] dark:border-zinc-800 mb-5';
export const table = 'w-full border-collapse text-[13.5px] bg-white dark:bg-zinc-900';
export const th = 'text-left bg-[#eef1f5] dark:bg-zinc-800 border border-[#e3e6ea] dark:border-zinc-800 py-[7px] px-2.5 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap';
export const td = 'border border-[#e3e6ea] dark:border-zinc-800 py-[7px] px-2.5 text-zinc-800 dark:text-zinc-200';
// 짝수행 옅은 배경 + hover 시 브랜드 틴트 — 원본 표 스타일 그대로.
export const trZebraHover = 'even:bg-[#f8f9fb] dark:even:bg-zinc-800/30 hover:bg-brand-tint transition-colors';

// 상태값(결재상태/재직상태 등)에 색상 의미를 부여하는 배지.
export const badgeBase = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
export const badgeTone = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  gray: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
} as const;
