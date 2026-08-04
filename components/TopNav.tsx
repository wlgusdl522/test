'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_SECTIONS, STANDALONE_NAV_ITEMS } from '@/lib/nav';
import { signOutAction } from '@/lib/session-actions';
import SectionIcon from '@/components/SectionIcon';

const [HOME, MYPAGE] = STANDALONE_NAV_ITEMS;

export default function TopNav({ userName, userSubtitle }: { userName: string; userSubtitle: string }) {
  const pathname = usePathname();
  const [openSection, setOpenSection] = useState<string | null>(null);

  function tabClass(active: boolean) {
    return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-brand-tint text-brand'
        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
    }`;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-14 items-center gap-1 px-6">
        <Link href="/" className="mr-4 flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">서</span>
          <span className="hidden text-[13px] font-bold leading-tight text-zinc-900 dark:text-zinc-100 sm:block">
            서대문노인종합복지관 업무포털
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          <Link href={HOME.href} className={tabClass(pathname === HOME.href)}>
            {HOME.label}
          </Link>

          {NAV_SECTIONS.map((section) => {
            const active = section.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

            // flat 섹션(항목이 늘어날 계획이 없는 단일 항목)은 드롭다운 없이 바로 링크로 보여준다 (Sidebar와 동일 규칙).
            if (section.flat && section.items.length === 1) {
              const item = section.items[0];
              return (
                <Link key={section.label} href={item.href} className={tabClass(active)}>
                  {item.label}
                </Link>
              );
            }

            const open = openSection === section.label;
            return (
              <div key={section.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenSection(open ? null : section.label)}
                  className={`flex items-center gap-1.5 ${tabClass(active || open)}`}
                >
                  {section.label}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {open && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenSection(null)} />
                    <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                      {section.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenSection(null)}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
                            <SectionIcon label={section.label} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                            {item.description && (
                              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{item.description}</span>
                            )}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <Link href={MYPAGE.href} className={tabClass(pathname === MYPAGE.href)}>
            {MYPAGE.label}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-3 pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{userName}</p>
            <p className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">{userSubtitle}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title="로그아웃"
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m0-8H5a2 2 0 00-2 2v12a2 2 0 002 2h2" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
