import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { btn, btnDanger, btnSecondary, card, h1, input, label, pageWide, table, td, th } from '@/lib/ui';
import {
  addVehicleRequestAction,
  deleteVehicleRequestAction,
  deleteVehicleRequestSeriesAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  { value: 0, label: '일' }, { value: 1, label: '월' }, { value: 2, label: '화' },
  { value: 3, label: '수' }, { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' },
];

export default async function VehicleRequestsPage() {
  const [requests, vehicles] = await Promise.all([
    getVehicleRequestList(),
    getKeyedList(VEHICLE_LIST_TABLE),
  ]);

  return (
    <main className={pageWide}>
      <h1 className={h1}>차량사용신청</h1>

      <form action={addVehicleRequestAction} className={`${card} grid grid-cols-2 gap-3`}>
        <label className={label}>
          차량 *
          <select name="vehicleNo" required className={input}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
        </label>
        <label className={label}>
          사용일자 *
          <input type="date" name="date" required className={input} />
        </label>
        <label className={label}>
          출발시간
          <input type="time" name="startTime" className={input} />
        </label>
        <label className={label}>
          복귀시간
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
          동승자
          <input name="companions" className={input} />
        </label>
        <label className={label}>
          비고
          <input name="note" className={input} />
        </label>

        <div className="col-span-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
          <label className="text-sm"><input type="checkbox" name="recurring" /> 반복 일정으로 등록</label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {WEEKDAYS.map((w) => (
              <label key={w.value} className="text-xs text-zinc-600 dark:text-zinc-400">
                <input type="checkbox" name="weekday" value={w.value} /> {w.label}
              </label>
            ))}
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              반복 종료일 <input type="date" name="untilDate" className={`${input} inline-block w-auto`} />
            </label>
          </div>
        </div>

        <div className="col-span-2">
          <button type="submit" className={btn}>신청</button>
        </div>
      </form>

      <table className={table}>
        <thead>
          <tr>
            <th className={th}>사용일자</th><th className={th}>차량</th><th className={th}>신청자</th>
            <th className={th}>시간</th><th className={th}>목적</th><th className={th}>목적지</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td className={td}>{r.사용일자}</td>
              <td className={td}>{r.차량번호}</td>
              <td className={td}>{r.신청자명}</td>
              <td className={td}>{r.출발시간} ~ {r.복귀시간}</td>
              <td className={td}>{r.목적}</td>
              <td className={td}>{r.목적지}</td>
              <td className={`${td} flex gap-1.5`}>
                <form action={deleteVehicleRequestAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={btnDanger}>{r.반복그룹ID ? '삭제(이 건만)' : '삭제'}</button>
                </form>
                {r.반복그룹ID && (
                  <form action={deleteVehicleRequestSeriesAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" title="이 날짜 이후 반복 전체 삭제" className={btnSecondary}>삭제(이후 전체)</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
