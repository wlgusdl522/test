'use client';

import { useEffect, useState } from 'react';
import { btn, card } from '@/lib/ui';

export default function CardLedgerSplitLayout({
  formLabel,
  editKey,
  form,
  children,
}: {
  formLabel: string;
  editKey?: string;
  form: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(() => !!editKey);

  // 다른 행을 눌러 수정 대상이 바뀌면(=editKey가 바뀌면) 패널이 접혀 있어도 자동으로 펼친다.
  // 이 컴포넌트 자체는 절대 리마운트하지 않으므로(그러면 목록까지 같이 깜빡인다), 폼 안쪽
  // 내용은 별도로 <form key={editKey}>에서만 리마운트해서 값을 새로 채운다.
  useEffect(() => {
    setOpen(!!editKey);
  }, [editKey]);

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
