'use client';

import { useState } from 'react';
import { input } from '@/lib/ui';

export default function AbnormalCheckField({
  name,
  reasonName,
  label,
  defaultValue,
  defaultReason,
}: {
  name: string;
  reasonName: string;
  label: string;
  defaultValue?: string;
  defaultReason?: string;
}) {
  const [abnormal, setAbnormal] = useState(!!defaultValue && defaultValue !== '이상없음');

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" name={name} value="이상없음" checked={!abnormal} onChange={() => setAbnormal(false)} />
          이상없음
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name={name} value="이상" checked={abnormal} onChange={() => setAbnormal(true)} />
          이상
        </label>
      </div>
      {abnormal && (
        <input name={reasonName} defaultValue={defaultReason} placeholder="사유를 입력해주세요" className={input} />
      )}
    </div>
  );
}
