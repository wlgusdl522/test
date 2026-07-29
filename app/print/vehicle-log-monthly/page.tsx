import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE, VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { buildApprovalBoxData } from '@/lib/approval/approvalLine';
import ApprovalBox from '@/components/print/ApprovalBox';
import PrintButton from '@/components/print/PrintButton';
import { btn, card, input, table, tableWrap, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleLogMonthlyPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleNo?: string; ym?: string }>;
}) {
  const { vehicleNo, ym } = await searchParams;
  const yearMonth = ym ?? new Date().toISOString().slice(0, 7);
  const [logs, vehicles, approvalRules, approvalLine, me, staffList] = await Promise.all([
    getVehicleLogList(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getKeyedList(APPROVAL_JEONGYEOL_TABLE),
    getSimpleList(APPROVAL_LINE_SHEET_NAME),
    getViewerStaffRecord(),
    getStaffList(),
  ]);
  const targetVehicle = vehicleNo ?? vehicles[0]?.차량번호 ?? '';

  const filtered = logs
    .filter((r) => r.차량번호 === targetVehicle && r.운행일자.slice(0, 7) === yearMonth)
    .sort((a, b) => a.운행일자.localeCompare(b.운행일자));
  const vehicleType = vehicles.find((v) => v.차량번호 === targetVehicle)?.차종 ?? targetVehicle;
  const totalDistance = filtered.reduce((sum, r) => sum + Number(r.주행거리 || 0), 0);
  const totalFuelAmount = filtered.reduce((sum, r) => sum + Number(r.주유금액 || 0), 0);
  const totalFuelLiters = filtered.reduce((sum, r) => sum + Number(r.주유량 || 0), 0);
  const [year, month] = yearMonth.split('-');

  const rule = approvalRules.find((r) => r.페이지ID === 'vehicle-log-monthly');
  const approvalData = buildApprovalBoxData(
    approvalLine,
    rule?.전결기준 ?? '',
    rule?.담당표시 ?? '자동',
    rule?.결재라인여부 ?? '사용',
    me?.['직급/직책'] ?? '',
    me?.소속팀 ?? '',
    staffList
  );

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="vehicleNo" defaultValue={targetVehicle} className={`${input} w-auto`}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
          <input type="month" name="ym" defaultValue={yearMonth} className={`${input} w-auto`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className="bg-white dark:bg-zinc-900">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{vehicleType} 차량운행일지</h2>
            <div style={{ marginTop: 6, fontSize: 15, color: '#666' }}>
              {year}년 {Number(month)}월 총 운행거리 {totalDistance.toLocaleString()}km
              {' · '}{Number(month)}월 주유금액 {totalFuelAmount.toLocaleString()}원 {totalFuelLiters.toLocaleString()}L
            </div>
          </div>
          <ApprovalBox data={approvalData} />
        </div>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>운행일자</th><th className={th}>운전자</th><th className={th}>목적</th><th className={th}>목적지</th>
                <th className={th}>출발(km)</th><th className={th}>도착(km)</th><th className={th}>운행거리</th>
                <th className={th}>주유금액(원)</th><th className={th}>주유단가(원)</th><th className={th}>주유량(L)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className={td} colSpan={10} style={{ textAlign: 'center', color: '#888' }}>해당 월 운행 기록이 없습니다.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.운행일자}</td>
                  <td className={td}>{r.운전자명}</td>
                  <td className={td}>{r.목적}</td>
                  <td className={td}>{r.목적지}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.출발계기판}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.도착계기판}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.주행거리}km</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.주유금액 ? Number(r.주유금액).toLocaleString() : ''}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.주유단가 ? Number(r.주유단가).toLocaleString() : ''}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.주유량 || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
