'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_SECTIONS } from '@/lib/nav';

export default function Sidebar() {
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
    <nav className="w-56 shrink-0 border-r border-zinc-200 bg-white px-3 py-4 shadow-[1px_0_3px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/" className="mb-4 block px-2 text-sm font-semibold text-brand">
        서대문노인종합복지관
      </Link>
      {NAV_SECTIONS.map((section) => {
        const open = openSections.has(section.label);
        return (
          <div key={section.label} className="mb-1">
            <button
              type="button"
              onClick={() => toggle(section.label)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <span>{section.label}</span>
              <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
            </button>
            {open && (
              <ul className="mt-0.5 flex flex-col gap-0.5 pb-2">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-md py-1.5 pl-5 pr-2 text-sm transition-colors ${
                          active
                            ? 'bg-brand-tint font-medium text-brand'
                            : 'text-zinc-700 hover:bg-brand-tint hover:text-brand dark:text-zinc-300'
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
    </nav>
  );
}
