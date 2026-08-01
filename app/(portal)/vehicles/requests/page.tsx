import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { badgeBase, badgeTone, btnDanger, btnSecondary, inputBase, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import { deleteVehicleRequestAction, deleteVehicleRequestSeriesAction } from '@/app/(portal)/vehicles/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleMyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; all?: string }>;
}) {
  const { ym, all } = await searchParams;
  const [me, allRequests, allLogs] = await Promise.all([
    getViewerStaffRecord(),
    getVehicleRequestList(),
    getVehicleLogList(),
  ]);
  const viewerEmail = (me?.['이메일(아이디)'] ?? '').toLowerCase();
  const logByRequestId = new Map(allLogs.filter((l) => l.신청ID).map((l) => [l.신청ID, l]));
  const currentYm = new Date().toISOString().slice(0, 7);
  const showAll = all === '1';
  const activeYm = showAll ? '' : (ym || currentYm);

  const myRequests = allRequests
    .filter((r) => (r.신청자이메일 ?? '').toLowerCase() === viewerEmail)
    .filter((r) => !activeYm || r.사용일자.startsWith(activeYm));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <a
          href="/vehicles/requests"
          className={`text-xs px-2.5 py-1 rounded-full ${!ym && !showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          이번달
        </a>
        <form method="get" className="flex items-center gap-1.5">
          <input type="month" name="ym" defaultValue={ym ?? ''} className={`${inputBase} w-auto text-xs py-1`} />
          <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
        </form>
        <a
          href="/vehicles/requests?all=1"
          className={`text-xs px-2.5 py-1 rounded-full ${showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          전체보기
        </a>
      </div>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>사용일자</th><th className={th}>차량</th>
            <th className={th}>목적</th><th className={th}>목적지</th><th className={th}>운행일지</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {myRequests.length === 0 ? (
            <tr><td className={td} colSpan={6}><span className="text-zinc-400">해당 기간에 신청한 내역이 없습니다.</span></td></tr>
          ) : myRequests.map((r) => {
            const linkedLog = logByRequestId.get(r.id);
            return (
              <tr key={r.id} className={trZebraHover}>
                <td className={td}>{r.사용일자}</td>
                <td className={td}>{r.차량번호}</td>
                <td className={td}>{r.목적}</td>
                <td className={td}>{r.목적지}</td>
                <td className={td}>
                  <a
                    href={linkedLog ? `/vehicles/logs?edit=${linkedLog.id}#log-form` : `/vehicles/logs?requestId=${r.id}#log-form`}
                    className={`${badgeBase} ${linkedLog ? badgeTone.green : badgeTone.blue} hover:opacity-80`}
                  >
                    {linkedLog ? '작성됨' : '작성'}
                  </a>
                </td>
                <td className={`${td} flex gap-1.5`}>
                  <a href={`/vehicles?edit=${r.id}`} className={btnSecondary}>수정</a>
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
  );
}
