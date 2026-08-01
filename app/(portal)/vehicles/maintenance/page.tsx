import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleMaintenanceList } from '@/lib/mutate/vehicleMaintenance';
import { btn, btnDanger, btnSecondary, card, input, label, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addVehicleMaintenanceAction, deleteVehicleMaintenanceAction, updateVehicleMaintenanceAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [records, vehicles] = await Promise.all([
    getVehicleMaintenanceList(),
    getKeyedList(VEHICLE_LIST_TABLE),
  ]);
  const editing = edit ? records.find((r) => r.id === edit) : null;

  return (
    <>
      <FormToggle label={editing ? '정비 기록 수정' : '정비 등록'} defaultOpen={!!editing}>
      <form action={editing ? updateVehicleMaintenanceAction : addVehicleMaintenanceAction} className={`${card} grid grid-cols-2 gap-3`}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <label className={label}>
          차량 *
          <select name="vehicleNo" defaultValue={editing?.차량번호 ?? ''} required className={input}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
        </label>
        <label className={label}>
          정비일자 *
          <input type="date" name="date" defaultValue={editing?.정비일자 ?? ''} required className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          정비내용 *
          <input name="content" defaultValue={editing?.정비내용 ?? ''} required className={input} />
        </label>
        <label className={label}>
          주행거리
          <input type="number" name="mileage" defaultValue={editing?.주행거리 ?? ''} className={input} />
        </label>
        <label className={label}>
          지출액
          <input type="number" name="cost" defaultValue={editing?.지출액 ?? ''} className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          비고
          <input name="note" defaultValue={editing?.비고 ?? ''} className={input} />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
          {editing && <a href="/vehicles/maintenance" className="text-xs text-zinc-500 hover:underline">취소</a>}
        </div>
      </form>
      </FormToggle>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>정비일자</th><th className={th}>차량</th><th className={th}>정비내용</th>
            <th className={th}>주행거리</th><th className={th}>지출액</th><th className={th}>등록자</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className={trZebraHover}>
              <td className={td}>{r.정비일자}</td>
              <td className={td}>{r.차량번호}</td>
              <td className={td}>{r.정비내용}</td>
              <td className={td}>{r.주행거리}</td>
              <td className={td}>{Number(r.지출액 || 0).toLocaleString()}원</td>
              <td className={td}>{r.등록자명}</td>
              <td className={`${td} flex gap-1.5`}>
                <a href={`/vehicles/maintenance?edit=${r.id}`} className={btnSecondary}>수정</a>
                <form action={deleteVehicleMaintenanceAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={btnDanger}>삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
