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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);

  function tabClass(active: boolean) {
    return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-brand-tint text-brand'
        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
    }`;
  }

  function mobileLinkClass(active: boolean) {
    return `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-brand-tint text-brand'
        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
    }`;
  }

  function closeMobile() {
    setMobileOpen(false);
    setMobileSection(null);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-14 items-center gap-1 px-4 md:px-6">
        <Link href="/" className="mr-4 flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">서</span>
          <span className="hidden text-[13px] font-bold leading-tight text-zinc-900 dark:text-zinc-100 sm:block">
            서대문노인종합복지관 업무포털
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
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
                      {(section.groups ?? [{ label: '', items: section.items }]).map((group, gi) => (
                        <div key={group.label || '_'} className={gi > 0 ? 'mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800' : ''}>
                          {group.label && (
                            <p className="px-3 pt-1.5 pb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                              {group.label}
                            </p>
                          )}
                          {group.items.map((item) => (
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

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 md:hidden"
          aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
        >
          {mobileOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

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

      {mobileOpen && (
        <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <Link href={HOME.href} onClick={closeMobile} className={mobileLinkClass(pathname === HOME.href)}>
            {HOME.label}
          </Link>

          {NAV_SECTIONS.map((section) => {
            if (section.flat && section.items.length === 1) {
              const item = section.items[0];
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={section.label} href={item.href} onClick={closeMobile} className={mobileLinkClass(active)}>
                  {item.label}
                </Link>
              );
            }

            const open = mobileSection === section.label;
            return (
              <div key={section.label}>
                <button
                  type="button"
                  onClick={() => setMobileSection(open ? null : section.label)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
                  <div className="ml-[19px] flex flex-col gap-2 border-l border-zinc-200 py-1 pl-4 dark:border-zinc-800">
                    {(section.groups ?? [{ label: '', items: section.items }]).map((group) => (
                      <div key={group.label || '_'} className="flex flex-col gap-0.5">
                        {group.label && (
                          <p className="px-2.5 pb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            {group.label}
                          </p>
                        )}
                        {group.items.map((item) => {
                          const active = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeMobile}
                              className={`block rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                                active
                                  ? 'bg-brand-tint font-medium text-brand'
                                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900'
                              }`}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <Link href={MYPAGE.href} onClick={closeMobile} className={mobileLinkClass(pathname === MYPAGE.href)}>
            {MYPAGE.label}
          </Link>

          <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-900">
            <p className="truncate px-3 text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{userName}</p>
            <p className="truncate px-3 text-[11.5px] text-zinc-500 dark:text-zinc-400">{userSubtitle}</p>
          </div>
        </div>
      )}
    </header>
  );
}
