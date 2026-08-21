// 일관되고 세련된 모던 엔터프라이즈 포털 스타일 토큰
export const page = 'p-6 sm:p-8 max-w-4xl mx-auto';
export const pageWide = 'p-6 sm:p-8 max-w-6xl mx-auto';
export const pageFluid = 'p-4 sm:p-8 max-w-[1600px] mx-auto';

export const pageHeader = 'flex items-center justify-between mb-6 flex-wrap gap-4';
export const h1 = 'text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 m-0';
export const h2 = 'text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200 mt-6 mb-3 pb-2 border-b border-slate-200/80 dark:border-zinc-800 first:mt-0';
export const hint = 'text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed';

export const card =
  'rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6 mb-6 transition-all';

export const statCard =
  'flex-1 rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-brand transition-all hover:shadow-md hover:-translate-y-0.5';

export const inputBase =
  'rounded-lg border border-slate-300 dark:border-zinc-700 px-3.5 py-2 text-sm bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all duration-150';
export const input = `w-full ${inputBase}`;

export const label = 'flex flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300';

export const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all duration-150 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer';

export const btnOutline =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 cursor-pointer';

export const btnSuccess =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer';

export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200/80 px-3 py-1.5 text-xs font-semibold transition-all duration-150 hover:bg-red-100 hover:text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60 active:scale-[0.98] disabled:opacity-50 cursor-pointer';

export const tableWrap = 'overflow-x-auto rounded-xl border border-slate-200/90 dark:border-zinc-800 mb-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] bg-white dark:bg-zinc-900';
export const table = 'w-full border-collapse text-[13.5px] bg-white dark:bg-zinc-900';
export const th = 'text-left bg-slate-50/90 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap text-xs';
export const td = 'border-b border-slate-100 dark:border-zinc-800/60 py-2.5 px-3.5 text-slate-700 dark:text-slate-200';
export const trZebraHover = 'even:bg-slate-50/50 dark:even:bg-zinc-800/20 hover:bg-brand-tint/70 transition-colors';

// 상태값 배지
export const badgeBase = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border';
export const badgeTone = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  red: 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  gray: 'bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  blue: 'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
} as const;

// --- 리스트+상세 패널 화면 공용 토큰 ---
export const pageSubtitle = 'text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mb-5 mt-1 leading-relaxed';

export const searchInput = `${inputBase} w-72 pl-9`;
export const selectFilter = `${inputBase} w-auto`;

// 값 태그 팔레트
export const tagBase = 'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap border';
export const tagPalette = [
  'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  'bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
  'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
] as const;

export const cardTableWrap =
  'min-w-0 flex-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-900';
export const tableClean = 'w-full text-[13.5px] bg-white dark:bg-zinc-900';
export const thClean =
  'text-left border-b border-slate-200 dark:border-zinc-800 py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs tracking-tight whitespace-nowrap bg-slate-50/70 dark:bg-zinc-900/60';
export const tdClean = 'border-b border-slate-100 dark:border-zinc-800/60 py-3 px-4 text-slate-700 dark:text-slate-200';
export const trHoverClean = 'transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/40';
export const listRow = 'cursor-pointer transition-colors hover:bg-brand-tint/60';
export const listRowActive = 'bg-brand-tint hover:bg-brand-tint font-medium';

export const filterPill =
  'text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-zinc-800';
export const filterPillActive = 'text-xs px-3.5 py-1.5 rounded-lg bg-brand text-white font-semibold shadow-sm';

export const detailPanelWrap =
  'w-full max-w-[380px] shrink-0 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-900 flex flex-col max-h-[calc(100vh-14rem)]';
export const detailHeader = 'flex items-start justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 p-5';
export const metaGrid = 'grid grid-cols-2 gap-x-4 gap-y-4 p-5 text-sm';
export const metaLabel = 'text-xs font-medium text-slate-400 dark:text-slate-500 mb-1';
export const metaValue = 'text-slate-800 dark:text-slate-100 font-semibold';
