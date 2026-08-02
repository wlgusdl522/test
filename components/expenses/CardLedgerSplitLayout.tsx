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

  const toggleBtn = (
    <button type="button" onClick={() => setOpen((v) => !v)} className={btn}>
      {open ? '접기 ▲' : `+ ${formLabel}`}
    </button>
  );

  // 닫혀 있을 땐 왼쪽에 아무 칸도 남기지 않는다 — 버튼은 목록 위에 한 줄로만 놓여서
  // 목록이 폭 전체를 그대로 쓴다. 열렸을 때만 왼쪽에 실제 폼 칸(340px)이 생긴다.
  if (!open) {
    return (
      <div>
        <div className="mb-3">{toggleBtn}</div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="w-[340px] shrink-0">
        {toggleBtn}
        <div className={`${card} mt-3`}>{form}</div>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
