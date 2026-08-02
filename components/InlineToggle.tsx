'use client';

import { useState } from 'react';
import { btn, card } from '@/lib/ui';

export default function InlineToggle({
  label,
  defaultOpen,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${btn} w-full justify-center`}>
        {open ? '접기 ▲' : `+ ${label}`}
      </button>
      {open && <div className={`${card} mt-3`}>{children}</div>}
    </div>
  );
}
