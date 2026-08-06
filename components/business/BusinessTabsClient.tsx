'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const TABS = [
  { href: '/business/daily', label: '업무입력' },
  { href: '/business/monthly', label: '월별현황' },
];

export default function BusinessTabsClient({ businesses }: { businesses: string[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const current = searchParams.get('business') || businesses[0] || '';

  function onBusinessChange(name: string) {
    const sp = new URLSearchParams(searchParams);
    sp.set('business', name);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="mb-5">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {businesses.map((name) => {
          const isActive = name === current;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onBusinessChange(name)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
      {pathname !== '/business' && (
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {TABS.map((t) => {
            const isActive = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={`${t.href}?business=${encodeURIComponent(current)}`}
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
          <a
            href={`/print/business-worklog?business=${encodeURIComponent(current)}`}
            target="_blank"
            className="-mb-px rounded-t-md border border-transparent px-3.5 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            일지인쇄 ↗
          </a>
        </div>
      )}
    </div>
  );
}
