'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ExpenseTabsClient({ canReview }: { canReview: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: '/expenses', label: '입력화면' },
    { href: '/expenses/mine', label: '담당자 조회' },
    ...(canReview ? [{ href: '/expenses/review', label: '회계 조회·인쇄' }] : []),
  ];

  return (
    <div className="mb-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {tabs.map((t) => {
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
