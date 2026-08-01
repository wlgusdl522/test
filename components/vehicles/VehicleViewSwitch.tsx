'use client';

import { inputBase } from '@/lib/ui';

const VIEWS = [
  { value: 'month', label: '월간' },
  { value: 'week', label: '주간' },
  { value: 'day', label: '일간' },
];

export default function VehicleViewSwitch({
  view,
  onChange,
}: {
  view: string;
  onChange: (view: 'month' | 'week' | 'day') => void;
}) {
  return (
    <select
      value={view}
      onChange={(e) => onChange(e.target.value as 'month' | 'week' | 'day')}
      className={`${inputBase} w-auto text-sm py-1.5`}
    >
      {VIEWS.map((v) => (
        <option key={v.value} value={v.value}>{v.label}</option>
      ))}
    </select>
  );
}
