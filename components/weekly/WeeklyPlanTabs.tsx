import Link from 'next/link';

const TABS = [
  { href: '/weekly-plan', label: '작성' },
  { href: '/weekly-plan/team', label: '전체보기' },
  { href: '/weekly-plan/review', label: '부서장확인' },
  { href: '/weekly-plan/meeting', label: '회의록작성' },
];

export default function WeeklyPlanTabs({ active }: { active: string }) {
  return (
    <div className="flex gap-1 mb-5 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((t) => {
        const isActive = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px rounded-t-md border border-b-0 px-3.5 py-2 text-sm transition-colors ${
              isActive
                ? 'border-zinc-200 bg-white font-medium text-brand dark:border-zinc-800 dark:bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
