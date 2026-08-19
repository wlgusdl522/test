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
  onOpen,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  wrapperClassName?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  // 드롭다운 메뉴 안에 넣을 때, 이 버튼을 눌러 모달을 여는 동시에 드롭다운 메뉴를 닫기 위한 훅.
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={wrapperClassName}>
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            onOpen?.();
          }}
          className={buttonClassName ?? btn}
        >
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
