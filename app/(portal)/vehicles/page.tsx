import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import VehicleReservationClient from '@/components/vehicles/VehicleReservationClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; edit?: string; new?: string }>;
}) {
  const { view: rawView, date, edit, new: isNew } = await searchParams;
  const view = rawView === 'week' || rawView === 'day' ? rawView : 'month';
  const [me, allRequests, vehicles, logs] = await Promise.all([
    getViewerStaffRecord(),
    getVehicleRequestList(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getVehicleLogList(),
  ]);
  const logByRequestId = new Map(logs.filter((l) => l.신청ID).map((l) => [l.신청ID, l]));
  const todayIso = new Date().toISOString().slice(0, 10);

  const fuelWarningByVehicle: Record<string, boolean> = {};
  for (const v of vehicles) {
    const vehicleLogs = logs
      .filter((l) => l.차량번호 === v.차량번호)
      .sort((a, b) => b.운행일자.localeCompare(a.운행일자));
    fuelWarningByVehicle[v.차량번호] = vehicleLogs[0]?.주유필요 === 'Y';
  }

  return (
    <VehicleReservationClient
      initialView={view}
      initialDate={date ?? todayIso}
      initialEditId={edit ?? ''}
      initialNew={isNew === '1'}
      requests={allRequests}
      vehicles={vehicles.map((v) => ({ 차량번호: v.차량번호, 차종: v.차종 }))}
      hasLogRequestIds={[...logByRequestId.keys()]}
      fuelWarningByVehicle={fuelWarningByVehicle}
      viewerEmail={me?.['이메일(아이디)'] ?? ''}
    />
  );
}
