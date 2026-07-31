import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { btn, btnDanger, h1, input, inputBase, page } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addVehicleAction, deleteVehicleAction, updateVehicleAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehiclesSettingsPage() {
  const vehicles = await getKeyedList(VEHICLE_LIST_TABLE);

  return (
    <main className={page}>
      <h1 className={h1}>설정 &gt; 차량관리 &gt; 차량목록</h1>

      <FormToggle label="차량 등록">
        <form action={addVehicleAction} className="flex gap-2 mb-6">
          <input name="number" placeholder="차량번호" required className={input} />
          <input name="type" placeholder="차종" className={input} />
          <button type="submit" className={btn}>추가</button>
        </form>
      </FormToggle>

      <ul className="flex flex-col gap-2">
        {vehicles.map((v) => (
          <li key={v.차량번호} className="flex items-center gap-2">
            <form action={updateVehicleAction} className="flex flex-1 gap-2">
              <input type="hidden" name="oldNumber" value={v.차량번호} />
              <input name="newNumber" defaultValue={v.차량번호} className={`${inputBase} w-28`} />
              <input name="type" defaultValue={v.차종} className={`${input} flex-1`} />
              <button type="submit" className={btn}>저장</button>
            </form>
            <form action={deleteVehicleAction}>
              <input type="hidden" name="number" value={v.차량번호} />
              <button type="submit" className={btnDanger}>삭제</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
