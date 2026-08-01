import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getMyPendingVehicleLogApprovals, getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { deleteVehicleRequestAction, deleteVehicleRequestSeriesAction } from '@/app/(portal)/vehicles/actions';
import { badgeBase, badgeTone, btn, btnDanger, btnSecondary, card, input, inputBase, label, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import PrinterIcon from '@/components/icons/PrinterIcon';
import StatusBadge from '@/components/StatusBadge';
import { actOnVehicleLogAction, addVehicleLogAction, deleteVehicleLogAction, updateVehicleLogAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; requestId?: string; q?: string; ym?: string; reqQ?: string; reqYm?: string }>;
}) {
  const { edit, requestId, q, ym, reqQ, reqYm } = await searchParams;
  const [allLogs, pending, vehicles, allRequests] = await Promise.all([
    getVehicleLogList(),
    getMyPendingVehicleLogApprovals(),
    getKeyedList(VEHICLE_LIST_TABLE),
    getVehicleRequestList(),
  ]);
  const editing = edit ? allLogs.find((r) => r.id === edit) : null;
  const prefillRequest = !editing && requestId ? allRequests.find((r) => r.id === requestId) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const logByRequestId = new Map(allLogs.filter((l) => l.신청ID).map((l) => [l.신청ID, l]));

  const logs = allLogs.filter((r) => {
    if (ym && !r.운행일자.startsWith(ym)) return false;
    if (q && !`${r.목적} ${r.목적지} ${r.운전자명}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const requests = allRequests.filter((r) => {
    if (reqYm && !r.사용일자.startsWith(reqYm)) return false;
    if (reqQ && !`${r.목적} ${r.목적지} ${r.신청자명}`.toLowerCase().includes(reqQ.toLowerCase())) return false;
    return true;
  });

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <h3 id="log-form" className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-200">
            {editing ? '운행일지 수정' : '새 운행일지 등록'}
          </h3>
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
              {editing && <a href="/vehicles/logs" className="text-xs text-zinc-500 hover:underline">취소</a>}
            </div>
          </form>

          <div className="flex items-center gap-2 mt-6 mb-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">운행일지 목록</h3>
            <form method="get" className="flex items-center gap-1.5 ml-auto">
              <input type="month" name="ym" defaultValue={ym ?? ''} className={`${inputBase} w-auto text-xs py-1`} />
              <input name="q" defaultValue={q ?? ''} placeholder="목적/목적지/운전자" className={`${inputBase} w-auto text-xs py-1`} />
              <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
              {(ym || q) && <a href="/vehicles/logs" className="text-xs text-zinc-500 hover:underline">초기화</a>}
            </form>
          </div>
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
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">신청 목록</h3>
            <form method="get" className="flex items-center gap-1.5 ml-auto">
              <input type="month" name="reqYm" defaultValue={reqYm ?? ''} className={`${inputBase} w-auto text-xs py-1`} />
              <input name="reqQ" defaultValue={reqQ ?? ''} placeholder="목적/목적지/신청자" className={`${inputBase} w-auto text-xs py-1`} />
              <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
              {(reqYm || reqQ) && <a href="/vehicles/logs" className="text-xs text-zinc-500 hover:underline">초기화</a>}
            </form>
          </div>
          <div className={tableWrap}><table className={table}>
            <thead>
              <tr>
                <th className={th}>사용일자</th><th className={th}>차량</th><th className={th}>신청자</th>
                <th className={th}>목적</th><th className={th}>운행일지</th><th className={th}></th>
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
                    <td className={td}>{r.목적}</td>
                    <td className={td}>
                      <a
                        href={linkedLog ? `/vehicles/logs?edit=${linkedLog.id}#log-form` : `/vehicles/logs?requestId=${r.id}#log-form`}
                        className={`${badgeBase} ${linkedLog ? badgeTone.green : badgeTone.blue} hover:opacity-80`}
                      >
                        {linkedLog ? '작성됨' : '작성'}
                      </a>
                    </td>
                    <td className={`${td} flex gap-1.5`}>
                      <a href={`/vehicles?edit=${r.id}#request-form`} className={btnSecondary}>수정</a>
                      <form action={deleteVehicleRequestAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className={btnDanger}>{r.반복그룹ID ? '삭제(이 건만)' : '삭제'}</button>
                      </form>
                      {r.반복그룹ID && (
                        <form action={deleteVehicleRequestSeriesAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" title="이 날짜 이후 반복 전체 삭제" className={btnSecondary}>이후 전체삭제</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}
