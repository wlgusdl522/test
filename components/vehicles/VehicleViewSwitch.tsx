'use client';

import { useRouter } from 'next/navigation';
import { inputBase } from '@/lib/ui';

const VIEWS = [
  { value: 'month', label: '월간' },
  { value: 'week', label: '주간' },
  { value: 'day', label: '일간' },
];

export default function VehicleViewSwitch({ view, date }: { view: string; date: string }) {
  const router = useRouter();

  return (
    <select
      value={view}
      onChange={(e) => router.push(`/vehicles?view=${e.target.value}&date=${date}`)}
      className={`${inputBase} w-auto text-sm py-1.5`}
    >
      {VIEWS.map((v) => (
        <option key={v.value} value={v.value}>{v.label}</option>
      ))}
    </select>
  );
}
