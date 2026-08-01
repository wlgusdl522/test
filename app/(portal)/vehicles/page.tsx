import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { btn, input, inputBase, label } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import VehicleSelectWithFuelWarning from '@/components/vehicles/VehicleSelectWithFuelWarning';
import VehicleRequestCalendar from '@/components/vehicles/VehicleRequestCalendar';
import VehicleWeekCalendar from '@/components/vehicles/VehicleWeekCalendar';
import VehicleDayCalendar from '@/components/vehicles/VehicleDayCalendar';
import VehicleViewSwitch from '@/components/vehicles/VehicleViewSwitch';
import { addVehicleRequestAction, updateVehicleRequestAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  { value: 0, label: '일' }, { value: 1, label: '월' }, { value: 2, label: '화' },
  { value: 3, label: '수' }, { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' },
];

export default async function VehicleRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; edit?: string; new?: string }>;
}) {
  const { view: rawView, date, edit, new: isNew } = await searchParams;
  const view = rawView === 'week' || rawView === 'day' ? rawView : 'month';
  const [allRequests, vehicles, logs] = await Promise.all([
    getVehicleRequestList(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getVehicleLogList(),
  ]);
  const editing = edit ? allRequests.find((r) => r.id === edit) : null;
  const logByRequestId = new Map(logs.filter((l) => l.신청ID).map((l) => [l.신청ID, l]));
  const todayIso = new Date().toISOString().slice(0, 10);
  const anchorDate = date ?? todayIso;
  const formOpen = !!editing || isNew === '1';

  const fuelWarningByVehicle: Record<string, boolean> = {};
  for (const v of vehicles) {
    const vehicleLogs = logs
      .filter((l) => l.차량번호 === v.차량번호)
      .sort((a, b) => b.운행일자.localeCompare(a.운행일자));
    fuelWarningByVehicle[v.차량번호] = vehicleLogs[0]?.주유필요 === 'Y';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <VehicleViewSwitch view={view} date={anchorDate} />
        <FormToggle
          key={`${editing?.id ?? ''}-${isNew ?? ''}-${anchorDate}`}
          label={editing ? '신청 수정' : '신규 신청'}
          defaultOpen={formOpen}
        >
          <form action={editing ? updateVehicleRequestAction : addVehicleRequestAction} className="grid grid-cols-2 gap-3">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className={label}>
              차량 *
              <VehicleSelectWithFuelWarning
                vehicles={vehicles.map((v) => ({ 차량번호: v.차량번호, 차종: v.차종 }))}
                defaultValue={editing?.차량번호 ?? ''}
                fuelWarningByVehicle={fuelWarningByVehicle}
              />
            </label>
            <label className={label}>
              사용일자 *
              <input type="date" name="date" defaultValue={editing?.사용일자 ?? anchorDate} required className={input} />
            </label>
            <label className={label}>
              출발시간
              <input type="time" name="startTime" defaultValue={editing?.출발시간 ?? ''} className={input} />
            </label>
            <label className={label}>
              복귀시간
              <input type="time" name="endTime" defaultValue={editing?.복귀시간 ?? ''} className={input} />
            </label>
            <label className={label}>
              목적 *
              <input name="purpose" defaultValue={editing?.목적 ?? ''} required className={input} />
            </label>
            <label className={label}>
              목적지
              <input name="destination" defaultValue={editing?.목적지 ?? ''} className={input} />
            </label>
            <label className={label}>
              동승자
              <input name="companions" defaultValue={editing?.동승자 ?? ''} className={input} />
            </label>
            <label className={label}>
              비고
              <input name="note" defaultValue={editing?.비고 ?? ''} className={input} />
            </label>

            {!editing && (
              <div className="col-span-2 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
                <label className="text-sm"><input type="checkbox" name="recurring" /> 반복 일정으로 등록</label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {WEEKDAYS.map((w) => (
                    <label key={w.value} className="text-xs text-zinc-600 dark:text-zinc-400">
                      <input type="checkbox" name="weekday" value={w.value} /> {w.label}
                    </label>
                  ))}
                  <label className="text-xs text-zinc-600 dark:text-zinc-400">
                    반복 종료일 <input type="date" name="untilDate" className={`${inputBase} inline-block w-auto`} />
                  </label>
                </div>
              </div>
            )}

            <div className="col-span-2 flex items-center gap-3">
              <button type="submit" className={btn}>{editing ? '저장' : '신청'}</button>
            </div>
          </form>
        </FormToggle>
      </div>

      {view === 'month' && (
        <VehicleRequestCalendar
          date={anchorDate}
          requests={allRequests}
          vehicles={vehicles.map((v) => ({ 차량번호: v.차량번호, 차종: v.차종 }))}
          hasLogByRequestId={new Set(logByRequestId.keys())}
        />
      )}
      {view === 'week' && (
        <VehicleWeekCalendar
          date={anchorDate}
          requests={allRequests}
          vehicles={vehicles.map((v) => ({ 차량번호: v.차량번호, 차종: v.차종 }))}
          hasLogByRequestId={new Set(logByRequestId.keys())}
        />
      )}
      {view === 'day' && (
        <VehicleDayCalendar
          date={anchorDate}
          requests={allRequests}
          vehicles={vehicles.map((v) => ({ 차량번호: v.차량번호, 차종: v.차종 }))}
          hasLogByRequestId={new Set(logByRequestId.keys())}
        />
      )}
    </div>
  );
}
