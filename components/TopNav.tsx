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
    return `rounded-lg px-3.5 py-1.5 text-[13.5px] font-semibold transition-all duration-150 ${
      active
        ? 'bg-brand text-white shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-zinc-800/80'
    }`;
  }

  function mobileLinkClass(active: boolean) {
    return `block rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-150 ${
      active
        ? 'bg-brand text-white shadow-sm'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-800'
    }`;
  }

  function closeMobile() {
    setMobileOpen(false);
    setMobileSection(null);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex h-15 items-center gap-2 px-4 md:px-7 max-w-[1600px] mx-auto">
        <Link href="/" className="mr-5 flex shrink-0 items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-xs font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
            서
          </span>
          <div className="hidden sm:flex flex-col">
            <span className="text-[13.5px] font-bold leading-tight text-slate-900 dark:text-slate-100 group-hover:text-brand transition-colors">
              서대문노인종합복지관
            </span>
            <span className="text-[10.5px] font-medium leading-none text-slate-400 dark:text-slate-500">
              통합 업무포털 시스템
            </span>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center gap-1.5 md:flex">
          <Link href={HOME.href} className={tabClass(pathname === HOME.href)}>
            {HOME.label}
          </Link>

          {NAV_SECTIONS.map((section) => {
            const active = section.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

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
                  className={`flex items-center gap-1.5 ${
                    open ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white' : tabClass(active)
                  }`}
                >
                  <SectionIcon label={section.label} className="h-3.5 w-3.5" />
                  {section.label}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {open && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenSection(null)} />
                    <div className="absolute left-0 top-full z-50 mt-2.5 w-80 rounded-xl border border-slate-200/90 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in slide-in-from-top-1 duration-150">
                      {(section.groups ?? [{ label: '', items: section.items }]).map((group, gi) => (
                        <div key={group.label || '_'} className={gi > 0 ? 'mt-1.5 border-t border-slate-100 pt-1.5 dark:border-zinc-800' : ''}>
                          {group.label && (
                            <p className="px-3 pt-1.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {group.label}
                            </p>
                          )}
                          <div className="space-y-0.5">
                            {group.items.map((item) => {
                              const isItemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setOpenSection(null)}
                                  className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ${
                                    isItemActive
                                      ? 'bg-brand-tint text-brand dark:bg-brand-tint/20 dark:text-brand'
                                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                    isItemActive ? 'bg-brand text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    <SectionIcon label={section.label} className="h-3.5 w-3.5" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-semibold leading-snug">
                                      {item.label}
                                    </span>
                                    {item.description && (
                                      <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                        {item.description}
                                      </span>
                                    )}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
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
          className="ml-auto rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-900 md:hidden"
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

        <div className="flex shrink-0 items-center gap-3 pl-3 md:border-l md:border-slate-200/80 md:dark:border-zinc-800">
          <Link href="/mypage" className="hidden sm:flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200">
              {userName ? userName.slice(0, 1) : '직'}
            </span>
            <div className="text-left">
              <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100">{userName || '사용자'}</p>
              <p className="text-[10.5px] leading-tight text-slate-500 dark:text-slate-400">{userSubtitle || '서대문복지관'}</p>
            </div>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              title="로그아웃"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m0-8H5a2 2 0 00-2 2v12a2 2 0 002 2h2" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100vh-3.75rem)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 md:hidden animate-in fade-in duration-150">
          <div className="mb-3 flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{userName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{userSubtitle}</p>
            </div>
          </div>

          <div className="space-y-1">
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
                <div key={section.label} className="rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMobileSection(open ? null : section.label)}
                    className="flex w-full items-center justify-between rounded-lg px-3.5 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-900"
                  >
                    <span className="flex items-center gap-2.5">
                      <SectionIcon label={section.label} className="h-4 w-4" />
                      {section.label}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {open && (
                    <div className="ml-5 flex flex-col gap-1.5 border-l-2 border-slate-200 py-1.5 pl-3.5 dark:border-zinc-800">
                      {(section.groups ?? [{ label: '', items: section.items }]).map((group) => (
                        <div key={group.label || '_'} className="flex flex-col gap-0.5">
                          {group.label && (
                            <p className="px-2.5 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                                className={`block rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                                  active
                                    ? 'bg-brand text-white font-semibold shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-zinc-900'
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
          </div>
        </div>
      )}
    </header>
  );
}
