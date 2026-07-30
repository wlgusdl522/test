'use client';

import { useState } from 'react';
import { input } from '@/lib/ui';

export default function VehicleSelectWithFuelWarning({
  vehicles,
  defaultValue,
  fuelWarningByVehicle,
}: {
  vehicles: { 차량번호: string; 차종: string }[];
  defaultValue: string;
  fuelWarningByVehicle: Record<string, boolean>;
}) {
  const [selected, setSelected] = useState(defaultValue);
  return (
    <div>
      <select
        name="vehicleNo"
        defaultValue={defaultValue}
        required
        className={input}
        onChange={(e) => setSelected(e.target.value)}
      >
        {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
      </select>
      {fuelWarningByVehicle[selected] && (
        <p className="mt-1 text-xs text-[#b51c31]">⚠ 최근 운행일지 기준 이 차량은 주유가 필요합니다.</p>
      )}
    </div>
  );
}
