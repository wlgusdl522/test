import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { btn, btnDanger, btnSecondary, card, h1, input, label, pageWide, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import VehicleSelectWithFuelWarning from '@/components/vehicles/VehicleSelectWithFuelWarning';
import {
  addVehicleRequestAction,
  deleteVehicleRequestAction,
  deleteVehicleRequestSeriesAction,
  updateVehicleRequestAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  { value: 0, label: '일' }, { value: 1, label: '월' }, { value: 2, label: '화' },
  { value: 3, label: '수' }, { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' },
];

export default async function VehicleRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; ym?: string }>;
}) {
  const { edit, q, ym } = await searchParams;
  const [allRequests, vehicles, logs] = await Promise.all([
    getVehicleRequestList(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getVehicleLogList(),
  ]);
  const editing = edit ? allRequests.find((r) => r.id === edit) : null;
  const logByRequestId = new Map(logs.filter((l) => l.신청ID).map((l) => [l.신청ID, l]));

  const fuelWarningByVehicle: Record<string, boolean> = {};
  for (const v of vehicles) {
    const vehicleLogs = logs
      .filter((l) => l.차량번호 === v.차량번호)
      .sort((a, b) => b.운행일자.localeCompare(a.운행일자));
    fuelWarningByVehicle[v.차량번호] = vehicleLogs[0]?.주유필요 === 'Y';
  }

  const requests = allRequests.filter((r) => {
    if (ym && !r.사용일자.startsWith(ym)) return false;
    if (q && !`${r.목적} ${r.목적지} ${r.신청자명}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <main className={pageWide}>
      <h1 className={h1}>차량사용신청</h1>

      <form method="get" className="flex gap-2 mb-3">
        <input type="month" name="ym" defaultValue={ym ?? ''} className={`${input} w-auto`} />
        <input name="q" defaultValue={q ?? ''} placeholder="목적/목적지/신청자 검색" className={`${input} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
        {(ym || q) && <a href="/vehicles/requests" className="text-xs text-zinc-500 hover:underline self-center">초기화</a>}
      </form>

      <FormToggle label={editing ? '신청 수정' : '신규 신청'} defaultOpen={!!editing}>
      <form action={editing ? updateVehicleRequestAction : addVehicleRequestAction} className={`${card} grid grid-cols-2 gap-3`}>
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
          <input type="date" name="date" defaultValue={editing?.사용일자 ?? ''} required className={input} />
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
                반복 종료일 <input type="date" name="untilDate" className={`${input} inline-block w-auto`} />
              </label>
            </div>
          </div>
        )}

        <div className="col-span-2 flex items-center gap-3">
          <button type="submit" className={btn}>{editing ? '저장' : '신청'}</button>
          {editing && <a href="/vehicles/requests" className="text-xs text-zinc-500 hover:underline">취소</a>}
        </div>
      </form>
      </FormToggle>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>사용일자</th><th className={th}>차량</th><th className={th}>신청자</th>
            <th className={th}>시간</th><th className={th}>목적</th><th className={th}>목적지</th>
            <th className={th}>운행일지</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const linkedLog = logByRequestId.get(r.id);
            return (
              <tr key={r.id} className={trZebraHover}>
                <td className={td}>{r.사용일자}</td>
                <td className={td}>{r.차량번호}</td>
                <td className={td}>{r.신청자명}</td>
                <td className={td}>{r.출발시간} ~ {r.복귀시간}</td>
                <td className={td}>{r.목적}</td>
                <td className={td}>{r.목적지}</td>
                <td className={td}>
                  <a
                    href={linkedLog ? `/vehicles/logs?edit=${linkedLog.id}` : `/vehicles/logs?requestId=${r.id}`}
                    className="text-xs text-brand hover:underline"
                  >
                    {linkedLog ? '운행일지 보기/수정' : '운행일지 작성'}
                  </a>
                </td>
                <td className={`${td} flex gap-1.5`}>
                  <a href={`/vehicles/requests?edit=${r.id}`} className={btnSecondary}>수정</a>
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
            );
          })}
        </tbody>
      </table></div>
    </main>
  );
}
