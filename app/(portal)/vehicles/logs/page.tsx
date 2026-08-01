import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getMyPendingVehicleLogApprovals, getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { btn, btnDanger, btnSecondary, card, input, inputBase, label, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import PrinterIcon from '@/components/icons/PrinterIcon';
import StatusBadge from '@/components/StatusBadge';
import FormToggle from '@/components/FormToggle';
import { actOnVehicleLogAction, addVehicleLogAction, deleteVehicleLogAction, updateVehicleLogAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; requestId?: string; ym?: string; all?: string }>;
}) {
  const { edit, requestId, ym, all } = await searchParams;
  const [allLogs, pending, vehicles, vehicleRequests] = await Promise.all([
    getVehicleLogList(),
    getMyPendingVehicleLogApprovals(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getVehicleRequestList(),
  ]);
  const editing = edit ? allLogs.find((r) => r.id === edit) : null;
  const prefillRequest = !editing && requestId ? vehicleRequests.find((r) => r.id === requestId) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentYm = todayIso.slice(0, 7);
  const showAll = all === '1';
  const activeYm = showAll ? '' : (ym || currentYm);

  const logs = allLogs.filter((r) => !activeYm || r.운행일자.startsWith(activeYm));

  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <a href="/print/vehicle-log-monthly" target="_blank" className={btnSecondary}>
          <PrinterIcon />
          운행일지 월별 인쇄
        </a>
      </div>

      {pending.length > 0 && (
        <div className={`${card} mb-5`}>
          <h3 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-200">내 결재 대기 ({pending.length}건)</h3>
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
                      <input name="comment" placeholder="반려 사유" className={`${inputBase} w-28 text-xs`} />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <a
          href="/vehicles/logs"
          className={`text-xs px-2.5 py-1 rounded-full ${!ym && !showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          이번달
        </a>
        <form method="get" className="flex items-center gap-1.5">
          <input type="month" name="ym" defaultValue={ym ?? ''} className={`${inputBase} w-auto text-xs py-1`} />
          <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
        </form>
        <a
          href="/vehicles/logs?all=1"
          className={`text-xs px-2.5 py-1 rounded-full ${showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          전체보기
        </a>

        <span id="log-form" />
        <FormToggle
          key={`${editing?.id ?? ''}-${prefillRequest?.id ?? ''}`}
          label={editing ? '운행일지 수정' : '운행일지 등록'}
          defaultOpen={!!editing || !!prefillRequest}
        >
          <form action={editing ? updateVehicleLogAction : addVehicleLogAction} className="grid grid-cols-2 gap-3">
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
              <input type="date" name="date" defaultValue={editing?.운행일자 ?? prefillRequest?.사용일자 ?? todayIso} required className={input} />
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
              <div className="mt-2 flex flex-wrap gap-3">
                <input type="number" name="fuelAmount" defaultValue={editing?.주유금액 ?? ''} placeholder="주유금액" className={`${inputBase} w-auto`} />
                <input type="number" name="fuelUnitPrice" defaultValue={editing?.주유단가 ?? ''} placeholder="주유단가" className={`${inputBase} w-auto`} />
                <input type="number" name="fuelLiters" defaultValue={editing?.주유량 ?? ''} placeholder="주유량(L)" className={`${inputBase} w-auto`} />
              </div>
            </div>

            {!editing && (
              <div className="col-span-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
                <label className="text-sm"><input type="checkbox" name="needsMaintenance" /> 이번 운행 중 정비 진행</label>
                <div className="mt-2 flex flex-wrap gap-3">
                  <input name="maintenanceContent" placeholder="정비내용" className={`${inputBase} w-auto flex-1`} />
                  <input type="number" name="maintenanceCost" placeholder="지출액" className={`${inputBase} w-auto`} />
                </div>
              </div>
            )}

            <div className="col-span-2 flex items-center gap-3">
              <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
            </div>
          </form>
        </FormToggle>
      </div>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>운행일자</th><th className={th}>차량</th><th className={th}>운전자</th>
            <th className={th}>목적</th><th className={th}>주행거리</th><th className={th}>결재상태</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td className={td} colSpan={7}><span className="text-zinc-400">해당 기간에 등록된 운행일지가 없습니다.</span></td></tr>
          ) : logs.map((r) => (
            <tr key={r.id} className={trZebraHover}>
              <td className={td}>{r.운행일자}</td>
              <td className={td}>{r.차량번호}</td>
              <td className={td}>{r.운전자명}</td>
              <td className={td}>{r.목적}</td>
              <td className={td}>{r.주행거리}km</td>
              <td className={td}><StatusBadge status={r.결재상태} /></td>
              <td className={`${td} flex gap-1.5`}>
                <a href={`/vehicles/logs?edit=${r.id}#log-form`} className={btnSecondary}>수정</a>
                <form action={deleteVehicleLogAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={btnSecondary}>삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
