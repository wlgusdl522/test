'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_SECTIONS, STANDALONE_NAV_ITEMS } from '@/lib/nav';
import { signOutAction } from '@/lib/session-actions';

const SECTION_ICON: Record<string, string> = {
  인사관리: 'M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-3.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4',
  업무관리: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  차량관리: 'M8 17h8m-8 0a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0 2 2 0 00-4 0zm-9-6h10l2 6H5l2-6zm0 0l1-4h8l1 4',
  지출관리: 'M3 10h18M7 15h1m4 0h1M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
  설정: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

function SectionIcon({ label }: { label: string }) {
  const d = SECTION_ICON[label];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function Sidebar({ userName, userSubtitle }: { userName: string; userSubtitle: string }) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(NAV_SECTIONS.filter((s) => s.items.some((i) => i.href === pathname)).map((s) => s.label))
  );

  function toggle(label: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-5 dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/" className="mb-5 flex items-center gap-2 px-2">
        <Image src="/logo-icon.png" alt="" width={28} height={26} className="h-7 w-auto shrink-0" priority />
        <span className="text-[13px] font-bold leading-tight text-zinc-900 dark:text-zinc-100">
          서대문노인종합
          <br />
          복지관 업무포털
        </span>
      </Link>

      <ul className="mb-4 flex flex-col gap-0.5 border-b border-zinc-100 pb-4 dark:border-zinc-900">
        {STANDALONE_NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-tint text-brand'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_SECTIONS.map((section) => {
          const open = openSections.has(section.label);
          return (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => toggle(section.label)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                <span className="flex items-center gap-2">
                  <SectionIcon label={section.label} />
                  {section.label}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {open && (
                <ul className="relative ml-[19px] flex flex-col gap-0.5 border-l border-zinc-200 py-1 pl-4 dark:border-zinc-800">
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                            active
                              ? 'bg-brand-tint font-medium text-brand'
                              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-900">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{userName}</p>
            <p className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">{userSubtitle}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title="로그아웃"
              className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m0-8H5a2 2 0 00-2 2v12a2 2 0 002 2h2" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
