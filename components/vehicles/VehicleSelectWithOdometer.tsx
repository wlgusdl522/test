'use client';

import { useState } from 'react';
import { input, label } from '@/lib/ui';

export default function VehicleSelectWithOdometer({
  vehicles,
  defaultVehicle,
  lastOdoByVehicle,
  odoStart,
  allowAutoFill,
}: {
  vehicles: { 차량번호: string; 차종: string }[];
  defaultVehicle: string;
  lastOdoByVehicle: Record<string, string>;
  odoStart: string;
  allowAutoFill: boolean;
}) {
  const [vehicleNo, setVehicleNo] = useState(defaultVehicle);
  const [odo, setOdo] = useState(odoStart);

  function handleVehicleChange(v: string) {
    setVehicleNo(v);
    if (allowAutoFill) setOdo(lastOdoByVehicle[v] ?? '');
  }

  return (
    <>
      <label className={label}>
        차량 *
        <select
          name="vehicleNo"
          value={vehicleNo}
          onChange={(e) => handleVehicleChange(e.target.value)}
          required
          className={input}
        >
          {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
        </select>
      </label>
      <label className={label}>
        출발계기판(km)
        <input
          type="number"
          name="odoStart"
          value={odo}
          onChange={(e) => setOdo(e.target.value)}
          className={input}
        />
        {allowAutoFill && (
          <span className="text-xs text-zinc-400">최근 운행일지의 도착계기판 값이 자동으로 채워져요. 필요하면 수정하세요.</span>
        )}
      </label>
    </>
  );
}
