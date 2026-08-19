'use client';

import { useState } from 'react';

export default function CollapsibleCheckSection({
  checkboxName,
  checkLabel,
  defaultChecked,
  children,
}: {
  checkboxName: string;
  checkLabel: string;
  defaultChecked?: boolean;
  children: React.ReactNode;
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <div className="sm:col-span-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
      <label className="text-sm">
        <input type="checkbox" name={checkboxName} checked={checked} onChange={(e) => setChecked(e.target.checked)} /> {checkLabel}
      </label>
      {checked && <div className="mt-2 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}
