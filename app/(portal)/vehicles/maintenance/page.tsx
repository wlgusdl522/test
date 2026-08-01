import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleMaintenanceList } from '@/lib/mutate/vehicleMaintenance';
import { btn, btnDanger, btnSecondary, input, inputBase, label, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import PrinterIcon from '@/components/icons/PrinterIcon';
import { addVehicleMaintenanceAction, deleteVehicleMaintenanceAction, updateVehicleMaintenanceAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; ym?: string; all?: string }>;
}) {
  const { edit, ym, all } = await searchParams;
  const [allRecords, vehicles] = await Promise.all([
    getVehicleMaintenanceList(),
    getKeyedList(VEHICLE_LIST_TABLE),
  ]);
  const editing = edit ? allRecords.find((r) => r.id === edit) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentYm = todayIso.slice(0, 7);
  const showAll = all === '1';
  const activeYm = showAll ? '' : (ym || currentYm);
  const records = allRecords.filter((r) => !activeYm || r.정비일자.startsWith(activeYm));

  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <a href="/print/vehicle-maintenance" target="_blank" className={btnSecondary}>
          <PrinterIcon />
          정비일지 월별 인쇄
        </a>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <a
          href="/vehicles/maintenance"
          className={`text-xs px-2.5 py-1 rounded-full ${!ym && !showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          이번달
        </a>
        <form method="get" className="flex items-center gap-1.5">
          <input type="month" name="ym" defaultValue={ym || currentYm} className={`${inputBase} w-auto text-xs py-1`} />
          <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
        </form>
        <a
          href="/vehicles/maintenance?all=1"
          className={`text-xs px-2.5 py-1 rounded-full ${showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          전체보기
        </a>

        <FormToggle label={editing ? '정비 기록 수정' : '정비 등록'} defaultOpen={!!editing}>
        <form action={editing ? updateVehicleMaintenanceAction : addVehicleMaintenanceAction} className="grid grid-cols-2 gap-3">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <label className={label}>
            차량 *
            <select name="vehicleNo" defaultValue={editing?.차량번호 ?? ''} required className={input}>
              {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
            </select>
          </label>
          <label className={label}>
            정비일자 *
            <input type="date" name="date" defaultValue={editing?.정비일자 ?? todayIso} required className={input} />
          </label>
          <label className={`${label} col-span-2`}>
            정비내용 *
            <input name="content" defaultValue={editing?.정비내용 ?? ''} required className={input} />
          </label>
          <label className={label}>
            주행거리
            <input type="number" name="mileage" defaultValue={editing?.주행거리 ?? ''} className={input} />
          </label>
          <label className={label}>
            지출액
            <input type="number" name="cost" defaultValue={editing?.지출액 ?? ''} className={input} />
          </label>
          <label className={`${label} col-span-2`}>
            비고
            <input name="note" defaultValue={editing?.비고 ?? ''} className={input} />
          </label>
          <div className="col-span-2 flex items-center gap-3">
            <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
          </div>
        </form>
        </FormToggle>
      </div>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>정비일자</th><th className={th}>차량</th><th className={th}>정비내용</th>
            <th className={th}>주행거리</th><th className={th}>지출액</th><th className={th}>등록자</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr><td className={td} colSpan={7}><span className="text-zinc-400">해당 기간에 등록된 정비 기록이 없습니다.</span></td></tr>
          ) : records.map((r) => (
            <tr key={r.id} className={trZebraHover}>
              <td className={td}>{r.정비일자}</td>
              <td className={td}>{r.차량번호}</td>
              <td className={td}>{r.정비내용}</td>
              <td className={td}>{Number(r.주행거리 || 0).toLocaleString()}</td>
              <td className={td}>{Number(r.지출액 || 0).toLocaleString()}원</td>
              <td className={td}>{r.등록자명}</td>
              <td className={`${td} flex gap-1.5`}>
                <a href={`/vehicles/maintenance?edit=${r.id}`} className={btnSecondary}>수정</a>
                <form action={deleteVehicleMaintenanceAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmSubmitButton confirmMessage="이 정비 기록을 삭제할까요?" className={btnDanger}>삭제</ConfirmSubmitButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
