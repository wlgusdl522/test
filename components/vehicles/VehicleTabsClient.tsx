'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TOP_TABS = [
  {
    href: '/vehicles',
    label: '신청',
    isActive: (p: string) => p === '/vehicles' || p.startsWith('/vehicles/requests'),
  },
  {
    href: '/vehicles/logs',
    label: '일지',
    isActive: (p: string) => p.startsWith('/vehicles/logs') || p.startsWith('/vehicles/maintenance'),
  },
];

const SUB_TABS: Record<string, { href: string; label: string }[]> = {
  '/vehicles': [
    { href: '/vehicles', label: '예약' },
    { href: '/vehicles/requests', label: '전체예약내역' },
  ],
  '/vehicles/logs': [
    { href: '/vehicles/logs', label: '운행일지' },
    { href: '/vehicles/maintenance', label: '정비일지' },
  ],
};

export default function VehicleTabsClient() {
  const pathname = usePathname();
  const activeTop = TOP_TABS.find((t) => t.isActive(pathname));
  const subTabs = activeTop ? SUB_TABS[activeTop.href] : undefined;

  return (
    <div className="mb-5">
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TOP_TABS.map((t) => {
          const active = t.isActive(pathname);
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
      {subTabs && (
        <div className="flex gap-1.5 mt-3">
          {subTabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  active
                    ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
