import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { addVehicleAction, deleteVehicleAction, updateVehicleAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehiclesSettingsPage() {
  const vehicles = await getKeyedList(VEHICLE_LIST_TABLE);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <h1>설정 &gt; 차량관리 &gt; 차량목록</h1>

      <form action={addVehicleAction} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input name="number" placeholder="차량번호" required style={{ padding: 6 }} />
        <input name="type" placeholder="차종" style={{ padding: 6 }} />
        <button type="submit">추가</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {vehicles.map((v) => (
          <li key={v.차량번호} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <form action={updateVehicleAction} style={{ display: 'flex', gap: 8, flex: 1 }}>
              <input type="hidden" name="oldNumber" value={v.차량번호} />
              <input name="newNumber" defaultValue={v.차량번호} style={{ width: 100, padding: 6 }} />
              <input name="type" defaultValue={v.차종} style={{ flex: 1, padding: 6 }} />
              <button type="submit">저장</button>
            </form>
            <form action={deleteVehicleAction}>
              <input type="hidden" name="number" value={v.차량번호} />
              <button type="submit">삭제</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
