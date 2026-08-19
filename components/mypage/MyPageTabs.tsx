'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/mypage', label: '업무' },
  { href: '/mypage/settings', label: '내 설정' },
];

export default function MyPageTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((t) => {
        const isActive = pathname === t.href;
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
