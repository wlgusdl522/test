import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getMyPendingVehicleLogApprovals, getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { btn, btnDanger, btnSecondary, card, h1, h2, input, label, pageWide, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import StatusBadge from '@/components/StatusBadge';
import FormToggle from '@/components/FormToggle';
import { actOnVehicleLogAction, addVehicleLogAction, deleteVehicleLogAction, updateVehicleLogAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; requestId?: string }>;
}) {
  const { edit, requestId } = await searchParams;
  const [logs, pending, vehicles, vehicleRequests] = await Promise.all([
    getVehicleLogList(),
    getMyPendingVehicleLogApprovals(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getVehicleRequestList(),
  ]);
  const editing = edit ? logs.find((r) => r.id === edit) : null;
  const prefillRequest = !editing && requestId ? vehicleRequests.find((r) => r.id === requestId) : null;

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
                  <td className={`${td} flex items-center gap-1.5`}>
                    <form action={actOnVehicleLogAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnVehicleLogAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <input name="comment" placeholder="반려 사유" className={`${input} w-28 text-xs`} />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}

      <h2 className={h2}>{editing ? '운행일지 수정' : '새 운행일지 등록'}</h2>
      <FormToggle label={editing ? '운행일지 수정' : '운행일지 등록'} defaultOpen={!!editing || !!prefillRequest}>
      <form action={editing ? updateVehicleLogAction : addVehicleLogAction} className={`${card} grid grid-cols-2 gap-3`}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input type="hidden" name="requestId" value={editing?.신청ID ?? prefillRequest?.id ?? ''} />
        <label className={label}>
          차량 *
          <select name="vehicleNo" defaultValue={editing?.차량번호 ?? prefillRequest?.차량번호 ?? ''} required className={input}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
        </label>
        <label className={label}>
          운행일자 *
          <input type="date" name="date" defaultValue={editing?.운행일자 ?? prefillRequest?.사용일자 ?? ''} required className={input} />
        </label>
        <label className={label}>
          출발시간
          <input type="time" name="startTime" defaultValue={editing?.출발시간 ?? prefillRequest?.출발시간 ?? ''} className={input} />
        </label>
        <label className={label}>
          도착시간
          <input type="time" name="endTime" defaultValue={editing?.도착시간 ?? prefillRequest?.복귀시간 ?? ''} className={input} />
        </label>
        <label className={label}>
          목적 *
          <input name="purpose" defaultValue={editing?.목적 ?? prefillRequest?.목적 ?? ''} required className={input} />
        </label>
        <label className={label}>
          목적지
          <input name="destination" defaultValue={editing?.목적지 ?? prefillRequest?.목적지 ?? ''} className={input} />
        </label>
        <label className={label}>
          출발계기판(km)
          <input type="number" name="odoStart" defaultValue={editing?.출발계기판 ?? ''} className={input} />
        </label>
        <label className={label}>
          도착계기판(km)
          <input type="number" name="odoEnd" defaultValue={editing?.도착계기판 ?? ''} className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          비고
          <input name="note" defaultValue={editing?.비고 ?? ''} className={input} />
        </label>
        <div className="col-span-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
          <label className="text-sm"><input type="checkbox" name="needsFuel" defaultChecked={editing?.주유필요 === 'Y'} /> 이번 운행에 주유함</label>
          <div className="mt-2 flex gap-3">
            <input type="number" name="fuelAmount" defaultValue={editing?.주유금액 ?? ''} placeholder="주유금액" className={`${input} w-auto`} />
            <input type="number" name="fuelUnitPrice" defaultValue={editing?.주유단가 ?? ''} placeholder="주유단가" className={`${input} w-auto`} />
            <input type="number" name="fuelLiters" defaultValue={editing?.주유량 ?? ''} placeholder="주유량(L)" className={`${input} w-auto`} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
          {editing && <a href="/vehicles/logs" className="text-xs text-zinc-500 hover:underline">취소</a>}
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
              <td className={`${td} flex gap-1.5`}>
                <a href={`/vehicles/logs?edit=${r.id}`} className={btnSecondary}>수정</a>
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
