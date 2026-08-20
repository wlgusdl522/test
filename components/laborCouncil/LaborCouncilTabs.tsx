'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { base: '/labor-council', label: '안건 제안', withRound: false },
  { base: '/labor-council/status', label: '안건 현황', withRound: false },
  { base: '/labor-council/meetings', label: '회의 관리', withRound: false },
  { base: '/labor-council/minutes', label: '회의록 및 결과', withRound: true },
];

// 회차가 의미 있는 탭(회의록)만 조회 중인 회차를 쿼리로 이어붙인다 — 안건 제안/현황/회의 관리는
// 회차와 무관하게 항상 전체를 보여주므로 붙이지 않는다.
export default function LaborCouncilTabs({ 회차 }: { 회차?: string }) {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((t) => {
        const active = pathname === t.base;
        const href = t.withRound && 회차 ? `${t.base}?round=${회차}` : t.base;
        return (
          <Link
            key={t.base}
            href={href}
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
