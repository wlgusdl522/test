'use client';

import { useState } from 'react';
import { btn, card } from '@/lib/ui';

export default function CardLedgerSplitLayout({
  formLabel,
  defaultOpen,
  form,
  children,
}: {
  formLabel: string;
  defaultOpen?: boolean;
  form: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="flex gap-6 items-start">
      <div className={open ? 'w-[340px] shrink-0' : 'shrink-0'}>
        <button type="button" onClick={() => setOpen((v) => !v)} className={btn}>
          {open ? '접기 ▲' : `+ ${formLabel}`}
        </button>
        {open && <div className={`${card} mt-3`}>{form}</div>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
