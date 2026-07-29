import { getMyRecordsSummary } from '@/lib/mutate/dashboard';
import { getMyPendingItemCheckReportApprovals } from '@/lib/mutate/itemCheckReport';
import { getMyPendingVehicleLogApprovals } from '@/lib/mutate/vehicleLog';
import { btn, btnDanger, h1, h2, pageWide, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import { actOnItemCheckReportAction } from '@/app/(portal)/expenses/reports/actions';
import { actOnVehicleLogAction } from '@/app/(portal)/vehicles/logs/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function MyPage() {
  const [summary, pendingReports, pendingLogs] = await Promise.all([
    getMyRecordsSummary(),
    getMyPendingItemCheckReportApprovals(),
    getMyPendingVehicleLogApprovals(),
  ]);

  return (
    <main className={pageWide}>
      <h1 className={h1}>마이페이지</h1>

      <h2 className={h2}>처리할 일</h2>
      <ul className="mb-6 flex flex-col gap-1">
        {summary.pendingTasks.map((t) => (
          <li key={`${t.section}-${t.id}`} className="text-sm text-zinc-700 dark:text-zinc-300">
            [{t.status}] {t.date} · {t.title}
          </li>
        ))}
        {summary.pendingTasks.length === 0 && <li className="text-sm text-zinc-400">처리할 일이 없습니다.</li>}
      </ul>

      {(pendingReports.length > 0 || pendingLogs.length > 0) && (
        <>
          <h2 className={h2}>내 결재함</h2>
          <div className={tableWrap}><table className={table}>
            <thead>
              <tr><th className={th}>구분</th><th className={th}>내용</th><th className={th}>단계</th><th className={th}></th></tr>
            </thead>
            <tbody>
              {pendingReports.map((r) => (
                <tr key={`report-${r.id}`} className={trZebraHover}>
                  <td className={td}>물품검수조서</td>
                  <td className={td}>{r.품명} · {Number(r.금액 || 0).toLocaleString()}원</td>
                  <td className={td}>{r.현재결재단계}</td>
                  <td className={`${td} flex gap-1.5`}>
                    <form action={actOnItemCheckReportAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnItemCheckReportAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
              {pendingLogs.map((r) => (
                <tr key={`log-${r.id}`} className={trZebraHover}>
                  <td className={td}>차량운행일지</td>
                  <td className={td}>{r.차량번호} · {r.목적}</td>
                  <td className={td}>{r.현재결재단계}</td>
                  <td className={`${td} flex gap-1.5`}>
                    <form action={actOnVehicleLogAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnVehicleLogAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}

      <h2 className={h2}>최근 카드사용대장</h2>
      <ul className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
        {summary.cardLedger.map((r) => <li key={r.id}>{r.사용일자} · {r.사용내역} · {Number(r.사용금액 || 0).toLocaleString()}원</li>)}
      </ul>

      <h2 className={h2}>최근 차량사용신청</h2>
      <ul className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
        {summary.vehicleRequest.map((r) => <li key={r.id}>{r.사용일자} · {r.차량번호} · {r.목적}</li>)}
      </ul>
    </main>
  );
}
