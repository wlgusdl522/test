'use client';

import { useState } from 'react';
import { btnOutline, btnSecondary } from '@/lib/ui';

export default function VolumeTabs({
  volumes,
  defaultVolume,
  panels,
}: {
  volumes: number[];
  defaultVolume: number;
  panels: Record<number, React.ReactNode>;
}) {
  const [selected, setSelected] = useState(defaultVolume);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {volumes.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSelected(v)}
            className={v === selected ? `${btnOutline} bg-brand-tint` : btnSecondary}
          >
            {v}권
          </button>
        ))}
      </div>
      {panels[selected]}
    </div>
  );
}
