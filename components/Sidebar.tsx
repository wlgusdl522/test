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
      <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
          aria-label="메뉴 열기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={24} height={22} className="h-6 w-auto shrink-0" priority />
          <span className="truncate text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
            서대문노인종합복지관 업무포털
          </span>
        </Link>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      <nav
        className={`fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col overflow-y-auto border-r border-zinc-200 bg-white px-3 py-5 transition-transform duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:translate-x-0 ${
          open ? 'translate-x-0' : ''
        }`}
      >
        <div className="mb-5 flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <Image src="/logo-icon.png" alt="" width={28} height={26} className="h-7 w-auto shrink-0" priority />
            <span className="text-[13px] font-bold leading-tight text-zinc-900 dark:text-zinc-100">
              서대문노인종합
              <br />
              복지관 업무포털
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 md:hidden"
            aria-label="메뉴 닫기"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="mb-4 flex flex-col gap-0.5 border-b border-zinc-100 pb-4 dark:border-zinc-900">
          {STANDALONE_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
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
            // flat 섹션(항목이 늘어날 계획이 없는 단일 항목)은 펼치고 접는 과정 없이 바로 링크로 보여준다.
            if (section.flat && section.items.length === 1) {
              const item = section.items[0];
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={section.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors ${
                    active
                      ? 'bg-brand-tint text-brand'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
                  }`}
                >
                  <SectionIcon label={section.label} />
                  {item.label}
                </Link>
              );
            }

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
                            onClick={() => setOpen(false)}
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
    </>
  );
}
