'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/expenses', label: '카드사용대장' },
  { href: '/expenses/photos', label: '물품검수사진' },
  { href: '/expenses/reports', label: '물품검수조서' },
];

export default function ExpenseTabsClient() {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px rounded-t-md border border-b-0 px-3.5 py-2 text-sm transition-colors ${
              active
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
