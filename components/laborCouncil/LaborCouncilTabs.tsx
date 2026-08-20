'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { base: '/labor-council', label: '안건취합' },
  { base: '/labor-council/minutes', label: '회의록' },
];

// 조회 중인 회차를 유지한 채 탭을 오갈 수 있도록 round 쿼리를 그대로 붙여서 링크한다.
export default function LaborCouncilTabs({ 회차 }: { 회차: string }) {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((t) => {
        const active = pathname === t.base;
        return (
          <Link
            key={t.base}
            href={`${t.base}?round=${회차}`}
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
