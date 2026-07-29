import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleMaintenanceList } from '@/lib/mutate/vehicleMaintenance';
import { addVehicleMaintenanceAction, deleteVehicleMaintenanceAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleMaintenancePage() {
  const [records, vehicles] = await Promise.all([
    getVehicleMaintenanceList(),
    getKeyedList(VEHICLE_LIST_TABLE),
  ]);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>차량정비대장</h1>

      <form action={addVehicleMaintenanceAction} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '16px 0', border: '1px solid #ddd', padding: 16 }}>
        <label>
          차량 *
          <select name="vehicleNo" required style={{ width: '100%', padding: 6 }}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
        </label>
        <label>
          정비일자 *
          <input type="date" name="date" required style={{ width: '100%', padding: 6 }} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          정비내용 *
          <input name="content" required style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          주행거리
          <input type="number" name="mileage" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          지출액
          <input type="number" name="cost" style={{ width: '100%', padding: 6 }} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          비고
          <input name="note" style={{ width: '100%', padding: 6 }} />
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit">등록</button>
        </div>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>정비일자</th><th>차량</th><th>정비내용</th><th>주행거리</th><th>지출액</th><th>등록자</th><th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.정비일자}</td>
              <td>{r.차량번호}</td>
              <td>{r.정비내용}</td>
              <td>{r.주행거리}</td>
              <td>{Number(r.지출액 || 0).toLocaleString()}원</td>
              <td>{r.등록자명}</td>
              <td>
                <form action={deleteVehicleMaintenanceAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit">삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
