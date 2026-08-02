'use client';

import { useState } from 'react';

const TYPES = ['체크카드', '신용카드', '계좌이체'];

export default function CardTypeTabs({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <input type="hidden" name="type" value={value} />
      <div className="flex gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setValue(t)}
            className={`rounded-md px-3 py-2 text-sm border transition-colors ${
              value === t
                ? 'bg-brand text-white border-brand'
                : 'bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-[#dadce0] dark:border-zinc-700 hover:bg-[#eef1f6] dark:hover:bg-zinc-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
