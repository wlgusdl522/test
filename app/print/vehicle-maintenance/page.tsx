import { getVehicleMaintenanceList } from '@/lib/mutate/vehicleMaintenance';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE, VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { buildApprovalBoxData } from '@/lib/approval/approvalLine';
import ApprovalBox from '@/components/print/ApprovalBox';
import PrintButton from '@/components/print/PrintButton';
import { btn, card, inputBase, table, tableWrap, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleMaintenancePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleNo?: string; ym?: string }>;
}) {
  const { vehicleNo, ym } = await searchParams;
  const yearMonth = ym ?? new Date().toISOString().slice(0, 7);
  const [records, vehicles, approvalRules, approvalLine, me, staffList] = await Promise.all([
    getVehicleMaintenanceList(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getKeyedList(APPROVAL_JEONGYEOL_TABLE),
    getSimpleList(APPROVAL_LINE_SHEET_NAME),
    getViewerStaffRecord(),
    getStaffList(),
  ]);
  const targetVehicle = vehicleNo ?? vehicles[0]?.차량번호 ?? '';

  const filtered = records
    .filter((r) => r.차량번호 === targetVehicle && r.정비일자.slice(0, 7) === yearMonth)
    .sort((a, b) => a.정비일자.localeCompare(b.정비일자));
  const vehicleType = vehicles.find((v) => v.차량번호 === targetVehicle)?.차종 ?? targetVehicle;
  const totalCost = filtered.reduce((sum, r) => sum + Number(r.지출액 || 0), 0);
  const [year, month] = yearMonth.split('-');

  const rule = approvalRules.find((r) => r.페이지ID === 'vehicle-maintenance');
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
          <select name="vehicleNo" defaultValue={targetVehicle} className={`${inputBase} w-auto`}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
          <input type="month" name="ym" defaultValue={yearMonth} className={`${inputBase} w-auto`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className="bg-white dark:bg-zinc-900">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{vehicleType} 차량정비대장</h2>
            <div style={{ marginTop: 6, fontSize: 15, color: '#666' }}>
              {year}년 {Number(month)}월 정비 지출액 총 {totalCost.toLocaleString()}원
            </div>
          </div>
          <ApprovalBox data={approvalData} />
        </div>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>정비일자</th><th className={th}>정비내용</th>
                <th className={th}>주행거리</th><th className={th}>지출액(원)</th><th className={th}>등록자</th><th className={th}>비고</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className={td} colSpan={6} style={{ textAlign: 'center', color: '#888' }}>해당 월 정비 기록이 없습니다.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.정비일자}</td>
                  <td className={td}>{r.정비내용}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.주행거리}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.지출액 ? Number(r.지출액).toLocaleString() : ''}</td>
                  <td className={td}>{r.등록자명}</td>
                  <td className={td}>{r.비고}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
