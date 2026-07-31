'use client';

import { detailPanelWrap, detailHeader } from '@/lib/ui';

export default function DetailPanel({
  title,
  subtitle,
  tag,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  tag?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className={detailPanelWrap}>
      <div className={detailHeader}>
        <div className="min-w-0">
          {tag && <div className="mb-2">{tag}</div>}
          <h3 className="truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
