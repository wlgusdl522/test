'use client';

import { useState } from 'react';
import { btn } from '@/lib/ui';
import Modal from '@/components/Modal';

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
        <Modal title={label} onClose={() => setOpen(false)}>
          {children}
        </Modal>
      )}
    </div>
  );
}
