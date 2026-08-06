'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { inputBase } from '@/lib/ui';

const TABS = [
  { href: '/business', label: '목표설정' },
  { href: '/business/daily', label: '일계입력' },
  { href: '/business/monthly', label: '월별현황' },
];

export default function BusinessTabsClient({ businesses }: { businesses: { name: string; team: string }[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const current = searchParams.get('business') || businesses[0]?.name || '';

  function onBusinessChange(name: string) {
    const sp = new URLSearchParams(searchParams);
    sp.set('business', name);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
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
      <select
        value={current}
        onChange={(e) => onBusinessChange(e.target.value)}
        className={`${inputBase} w-auto`}
      >
        {businesses.map((b) => (
          <option key={b.name} value={b.name}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}
