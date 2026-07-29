import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleLogMonthlyPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleNo?: string; ym?: string }>;
}) {
  const { vehicleNo, ym } = await searchParams;
  const yearMonth = ym ?? new Date().toISOString().slice(0, 7);
  const [logs, vehicles] = await Promise.all([getVehicleLogList(), getKeyedList(VEHICLE_LIST_TABLE)]);
  const targetVehicle = vehicleNo ?? vehicles[0]?.차량번호 ?? '';

  const filtered = logs
    .filter((r) => r.차량번호 === targetVehicle && r.운행일자.slice(0, 7) === yearMonth)
    .sort((a, b) => a.운행일자.localeCompare(b.운행일자));
  const vehicleType = vehicles.find((v) => v.차량번호 === targetVehicle)?.차종 ?? targetVehicle;
  const totalDistance = filtered.reduce((sum, r) => sum + Number(r.주행거리 || 0), 0);
  const totalFuelAmount = filtered.reduce((sum, r) => sum + Number(r.주유금액 || 0), 0);
  const totalFuelLiters = filtered.reduce((sum, r) => sum + Number(r.주유량 || 0), 0);
  const [year, month] = yearMonth.split('-');

  return (
    <div>
      <form method="get" className="mb-6 print:hidden">
        <select name="vehicleNo" defaultValue={targetVehicle}>
          {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
        </select>
        <input type="month" name="ym" defaultValue={yearMonth} />
        <button type="submit">조회</button>
      </form>

      <h2 style={{ textAlign: 'center' }}>{vehicleType} 차량운행일지</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>
        {year}년 {Number(month)}월 · 총 주행거리 {totalDistance.toLocaleString()}km
        {totalFuelAmount > 0 && ` · 주유금액 ${totalFuelAmount.toLocaleString()}원 · 주유량 ${totalFuelLiters.toLocaleString()}L`}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>운행일자</th><th>운전자</th><th>목적</th><th>목적지</th>
            <th>출발계기판</th><th>도착계기판</th><th>주행거리</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td>{r.운행일자}</td>
              <td>{r.운전자명}</td>
              <td>{r.목적}</td>
              <td>{r.목적지}</td>
              <td style={{ textAlign: 'right' }}>{r.출발계기판}</td>
              <td style={{ textAlign: 'right' }}>{r.도착계기판}</td>
              <td style={{ textAlign: 'right' }}>{r.주행거리}km</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
