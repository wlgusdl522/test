import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { btn, btnSecondary, cardTableWrap, input, inputBase, label, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import PrinterIcon from '@/components/icons/PrinterIcon';
import FormToggle from '@/components/FormToggle';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import VehicleSelectWithOdometer from '@/components/vehicles/VehicleSelectWithOdometer';
import CollapsibleCheckSection from '@/components/vehicles/CollapsibleCheckSection';
import { addVehicleLogAction, deleteVehicleLogAction, updateVehicleLogAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; requestId?: string; ym?: string; all?: string; vehicleNo?: string }>;
}) {
  const { edit, requestId, ym, all, vehicleNo } = await searchParams;
  const [allLogs, vehicles, vehicleRequests] = await Promise.all([
    getVehicleLogList(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getVehicleRequestList(),
  ]);
  const editing = edit ? allLogs.find((r) => r.id === edit) : null;
  const prefillRequest = !editing && requestId ? vehicleRequests.find((r) => r.id === requestId) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentYm = todayIso.slice(0, 7);
  const showAll = all === '1';
  const activeYm = showAll ? '' : (ym || currentYm);
  const activeVehicle = vehicleNo || '';
  const vehicleParam = activeVehicle ? `vehicleNo=${encodeURIComponent(activeVehicle)}` : '';

  const logs = allLogs
    .filter((r) => !activeYm || r.운행일자.startsWith(activeYm))
    .filter((r) => !activeVehicle || r.차량번호 === activeVehicle);

  const lastOdoByVehicle: Record<string, string> = {};
  for (const v of vehicles) {
    const vehicleLogs = allLogs
      .filter((l) => l.차량번호 === v.차량번호)
      .sort((a, b) => b.운행일자.localeCompare(a.운행일자));
    lastOdoByVehicle[v.차량번호] = vehicleLogs[0]?.도착계기판 ?? '';
  }

  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <a
          href={`/print/vehicle-log-monthly?ym=${activeYm || currentYm}${vehicleParam ? `&${vehicleParam}` : ''}`}
          target="_blank"
          className={btnSecondary}
        >
          <PrinterIcon />
          운행일지 월별 인쇄
        </a>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <a
          href={`/vehicles/logs${vehicleParam ? `?${vehicleParam}` : ''}`}
          className={`text-xs px-2.5 py-1 rounded-full ${!ym && !showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          이번달
        </a>
        <form method="get" className="flex items-center gap-1.5">
          <select name="vehicleNo" defaultValue={activeVehicle} className={`${inputBase} w-auto text-xs py-1`}>
            <option value="">전체 차량</option>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
          <input type="month" name="ym" defaultValue={ym || currentYm} className={`${inputBase} w-auto text-xs py-1`} />
          <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
        </form>
        <a
          href={`/vehicles/logs?all=1${vehicleParam ? `&${vehicleParam}` : ''}`}
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
            <VehicleSelectWithOdometer
              vehicles={vehicles.map((v) => ({ 차량번호: v.차량번호, 차종: v.차종 }))}
              defaultVehicle={editing?.차량번호 ?? prefillRequest?.차량번호 ?? ''}
              lastOdoByVehicle={lastOdoByVehicle}
              odoStart={editing ? editing.출발계기판 ?? '' : lastOdoByVehicle[prefillRequest?.차량번호 ?? ''] ?? ''}
              allowAutoFill={!editing}
            />
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
              도착계기판(km)
              <input type="number" name="odoEnd" defaultValue={editing?.도착계기판 ?? ''} className={input} />
            </label>
            <label className={`${label} col-span-2`}>
              비고
              <input name="note" defaultValue={editing?.비고 ?? ''} className={input} />
            </label>

            <CollapsibleCheckSection
              checkboxName="needsFuel"
              checkLabel="이번 운행에 주유함"
              defaultChecked={editing?.주유필요 === 'Y'}
            >
              <input type="number" name="fuelAmount" defaultValue={editing?.주유금액 ?? ''} placeholder="주유금액" className={`${inputBase} w-auto`} />
              <input type="number" name="fuelUnitPrice" defaultValue={editing?.주유단가 ?? ''} placeholder="주유단가" className={`${inputBase} w-auto`} />
              <input type="number" name="fuelLiters" defaultValue={editing?.주유량 ?? ''} placeholder="주유량(L)" className={`${inputBase} w-auto`} />
            </CollapsibleCheckSection>

            {!editing && (
              <CollapsibleCheckSection checkboxName="needsMaintenance" checkLabel="이번 운행 중 정비 진행">
                <input name="maintenanceContent" placeholder="정비내용" className={`${inputBase} w-auto flex-1`} />
                <input type="number" name="maintenanceCost" placeholder="지출액" className={`${inputBase} w-auto`} />
              </CollapsibleCheckSection>
            )}

            <div className="col-span-2 flex items-center gap-3">
              <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
            </div>
          </form>
        </FormToggle>
      </div>

      <div className={cardTableWrap}><table className={tableClean}>
        <thead>
          <tr>
            <th className={thClean}>운행일자</th><th className={thClean}>차량</th><th className={thClean}>운전자</th>
            <th className={thClean}>목적</th><th className={thClean}>주행거리</th><th className={thClean}></th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td className={tdClean} colSpan={6}><span className="text-zinc-400">해당 기간에 등록된 운행일지가 없습니다.</span></td></tr>
          ) : logs.map((r) => (
            <tr key={r.id} className={trHoverClean}>
              <td className={tdClean}>{r.운행일자}</td>
              <td className={tdClean}>{r.차량번호}</td>
              <td className={tdClean}>{r.운전자명}</td>
              <td className={tdClean}>{r.목적}</td>
              <td className={tdClean}>{Number(r.주행거리 || 0).toLocaleString()}km</td>
              <td className={`${tdClean} flex gap-1.5`}>
                <a href={`/vehicles/logs?edit=${r.id}#log-form`} className={btnSecondary}>수정</a>
                <form action={deleteVehicleLogAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmSubmitButton confirmMessage="이 운행일지를 삭제할까요?" className={btnSecondary}>삭제</ConfirmSubmitButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
