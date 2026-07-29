import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleMaintenanceList } from '@/lib/mutate/vehicleMaintenance';
import { btn, btnDanger, card, h1, input, label, pageWide, table, tableWrap, td, th } from '@/lib/ui';
import { addVehicleMaintenanceAction, deleteVehicleMaintenanceAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleMaintenancePage() {
  const [records, vehicles] = await Promise.all([
    getVehicleMaintenanceList(),
    getKeyedList(VEHICLE_LIST_TABLE),
  ]);

  return (
    <main className={pageWide}>
      <h1 className={h1}>차량정비대장</h1>

      <form action={addVehicleMaintenanceAction} className={`${card} grid grid-cols-2 gap-3`}>
        <label className={label}>
          차량 *
          <select name="vehicleNo" required className={input}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
        </label>
        <label className={label}>
          정비일자 *
          <input type="date" name="date" required className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          정비내용 *
          <input name="content" required className={input} />
        </label>
        <label className={label}>
          주행거리
          <input type="number" name="mileage" className={input} />
        </label>
        <label className={label}>
          지출액
          <input type="number" name="cost" className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          비고
          <input name="note" className={input} />
        </label>
        <div>
          <button type="submit" className={btn}>등록</button>
        </div>
      </form>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>정비일자</th><th className={th}>차량</th><th className={th}>정비내용</th>
            <th className={th}>주행거리</th><th className={th}>지출액</th><th className={th}>등록자</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td className={td}>{r.정비일자}</td>
              <td className={td}>{r.차량번호}</td>
              <td className={td}>{r.정비내용}</td>
              <td className={td}>{r.주행거리}</td>
              <td className={td}>{Number(r.지출액 || 0).toLocaleString()}원</td>
              <td className={td}>{r.등록자명}</td>
              <td className={td}>
                <form action={deleteVehicleMaintenanceAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={btnDanger}>삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </main>
  );
}
