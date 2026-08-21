'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_SECTIONS, STANDALONE_NAV_ITEMS } from '@/lib/nav';
import { signOutAction } from '@/lib/session-actions';
import SectionIcon from '@/components/SectionIcon';

export default function Sidebar({ userName, userSubtitle }: { userName: string; userSubtitle: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () =>
      new Set(
        NAV_SECTIONS.filter((s) => s.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))).map(
          (s) => s.label
        )
      )
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
    <>
      <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-900"
          aria-label="메뉴 열기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white shadow-xs">서</span>
          <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
            서대문노인종합복지관 포털
          </span>
        </Link>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden" onClick={() => setOpen(false)} />}

      <nav
        className={`fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col overflow-y-auto border-r border-slate-200/80 bg-white px-3.5 py-5 transition-transform duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:translate-x-0 shadow-sm ${
          open ? 'translate-x-0' : ''
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setOpen(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-xs font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
              서
            </span>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold leading-tight text-slate-900 dark:text-slate-100 group-hover:text-brand transition-colors">
                서대문노인종합복지관
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                업무포털 시스템
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-900 md:hidden"
            aria-label="메뉴 닫기"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="mb-4 flex flex-col gap-1 border-b border-slate-100 pb-3 dark:border-zinc-900">
          {STANDALONE_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-900'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {NAV_SECTIONS.map((section) => {
            if (section.flat && section.items.length === 1) {
              const item = section.items[0];
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={section.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-900'
                  }`}
                >
                  <SectionIcon label={section.label} className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            }

            const open = openSections.has(section.label);
            return (
              <div key={section.label} className="rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(section.label)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-900"
                >
                  <span className="flex items-center gap-2">
                    <SectionIcon label={section.label} className="h-4 w-4" />
                    {section.label}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {open && (
                  <div className="relative ml-4 flex flex-col gap-1 border-l-2 border-slate-200 py-1 pl-3 dark:border-zinc-800">
                    {(section.groups ?? [{ label: '', items: section.items }]).map((group) => (
                      <ul key={group.label || '_'} className="flex flex-col gap-0.5">
                        {group.label && (
                          <li className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {group.label}
                          </li>
                        )}
                        {group.items.map((item) => {
                          const active = pathname === item.href;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={`block rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${
                                  active
                                    ? 'bg-brand-tint font-bold text-brand dark:bg-brand-tint/20 dark:text-brand'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-zinc-900'
                                }`}
                              >
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-zinc-900">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-zinc-900">
            <div className="min-w-0 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold">
                {userName ? userName.slice(0, 1) : '직'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{userName || '사용자'}</p>
                <p className="truncate text-[10.5px] text-slate-500 dark:text-slate-400">{userSubtitle || '서대문복지관'}</p>
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title="로그아웃"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m0-8H5a2 2 0 00-2 2v12a2 2 0 002 2h2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </nav>
    </>
  );
}
