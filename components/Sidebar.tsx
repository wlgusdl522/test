'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_SECTIONS } from '@/lib/nav';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 px-3 py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/" className="mb-4 block px-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        서대문노인종합복지관
      </Link>
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="mb-4">
          <p className="mb-1 px-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">{section.label}</p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
