import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getMyPendingVehicleLogApprovals, getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { btn, btnDanger, btnSecondary, card, h1, h2, input, label, pageWide, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import StatusBadge from '@/components/StatusBadge';
import FormToggle from '@/components/FormToggle';
import { actOnVehicleLogAction, addVehicleLogAction, deleteVehicleLogAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleLogsPage() {
  const [logs, pending, vehicles] = await Promise.all([
    getVehicleLogList(),
    getMyPendingVehicleLogApprovals(),
    getKeyedList(VEHICLE_LIST_TABLE),
  ]);

  return (
    <main className={pageWide}>
      <div className="flex items-center justify-between">
        <h1 className={h1}>차량운행일지</h1>
        <a href="/print/vehicle-log-monthly" target="_blank" className="text-sm text-brand hover:underline">월별 인쇄</a>
      </div>

      {pending.length > 0 && (
        <>
          <h2 className={h2}>내 결재 대기 ({pending.length}건)</h2>
          <div className={tableWrap}><table className={table}>
            <thead>
              <tr><th className={th}>차량</th><th className={th}>운행일자</th><th className={th}>운전자</th><th className={th}>단계</th><th className={th}></th></tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id} className={trZebraHover}>
                  <td className={td}>{r.차량번호}</td>
                  <td className={td}>{r.운행일자}</td>
                  <td className={td}>{r.운전자명}</td>
                  <td className={td}>{r.현재결재단계}</td>
                  <td className={`${td} flex gap-1.5`}>
                    <form action={actOnVehicleLogAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnVehicleLogAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}

      <h2 className={h2}>새 운행일지 등록</h2>
      <FormToggle label="운행일지 등록">
      <form action={addVehicleLogAction} className={`${card} grid grid-cols-2 gap-3`}>
        <label className={label}>
          차량 *
          <select name="vehicleNo" required className={input}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
        </label>
        <label className={label}>
          운행일자 *
          <input type="date" name="date" required className={input} />
        </label>
        <label className={label}>
          출발시간
          <input type="time" name="startTime" className={input} />
        </label>
        <label className={label}>
          도착시간
          <input type="time" name="endTime" className={input} />
        </label>
        <label className={label}>
          목적 *
          <input name="purpose" required className={input} />
        </label>
        <label className={label}>
          목적지
          <input name="destination" className={input} />
        </label>
        <label className={label}>
          출발계기판(km)
          <input type="number" name="odoStart" className={input} />
        </label>
        <label className={label}>
          도착계기판(km)
          <input type="number" name="odoEnd" className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          비고
          <input name="note" className={input} />
        </label>
        <div className="col-span-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
          <label className="text-sm"><input type="checkbox" name="needsFuel" /> 이번 운행에 주유함</label>
          <div className="mt-2 flex gap-3">
            <input type="number" name="fuelAmount" placeholder="주유금액" className={`${input} w-auto`} />
            <input type="number" name="fuelUnitPrice" placeholder="주유단가" className={`${input} w-auto`} />
            <input type="number" name="fuelLiters" placeholder="주유량(L)" className={`${input} w-auto`} />
          </div>
        </div>
        <div>
          <button type="submit" className={btn}>등록</button>
        </div>
      </form>
      </FormToggle>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>운행일자</th><th className={th}>차량</th><th className={th}>운전자</th>
            <th className={th}>목적</th><th className={th}>주행거리</th><th className={th}>결재상태</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((r) => (
            <tr key={r.id} className={trZebraHover}>
              <td className={td}>{r.운행일자}</td>
              <td className={td}>{r.차량번호}</td>
              <td className={td}>{r.운전자명}</td>
              <td className={td}>{r.목적}</td>
              <td className={td}>{r.주행거리}km</td>
              <td className={td}><StatusBadge status={r.결재상태} /></td>
              <td className={td}>
                <form action={deleteVehicleLogAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={btnSecondary}>삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </main>
  );
}
