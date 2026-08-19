'use client';

import { useState } from 'react';
import { btn } from '@/lib/ui';
import Modal from '@/components/Modal';

export default function FormToggle({
  label,
  defaultOpen = false,
  wrapperClassName = 'mb-5',
  buttonLabel,
  buttonClassName,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  wrapperClassName?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={wrapperClassName}>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className={buttonClassName ?? btn}>
          {buttonLabel ?? `+ ${label}`}
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
