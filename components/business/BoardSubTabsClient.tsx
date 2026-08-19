'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BoardSubTabsClient({ tabs, ym }: { tabs: { href: string; label: string }[]; ym?: string }) {
  const pathname = usePathname();

  if (tabs.length <= 1) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const isActive = pathname === t.href;
        const href = ym ? `${t.href}?ym=${ym}` : t.href;
        return (
          <Link
            key={t.href}
            href={href}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              isActive
                ? 'bg-brand text-white'
                : 'bg-[#eef1f6] text-zinc-600 hover:bg-[#e3e7ee] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
