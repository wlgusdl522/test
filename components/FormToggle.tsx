'use client';

import { useState } from 'react';
import { btn } from '@/lib/ui';

export default function FormToggle({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-5">
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className={btn}>
          + {label}
        </button>
      )}
      {open && (
        <div>
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 text-xs text-zinc-500 hover:underline"
          >
            접기
          </button>
        </div>
      )}
    </div>
  );
}
