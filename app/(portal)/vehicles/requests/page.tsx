import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { badgeBase, badgeTone, btnDanger, btnSecondary, cardTableWrap, inputBase, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { deleteVehicleRequestFormAction, deleteVehicleRequestSeriesFormAction } from '@/app/(portal)/vehicles/actions';
import { hasVehicleUseEnded } from '@/lib/vehicleTimeOverlap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function VehicleMyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; all?: string; mine?: string; deleted?: string; seriesDeleted?: string }>;
}) {
  const { ym, all, mine, deleted, seriesDeleted } = await searchParams;
  const [me, allRequests, allLogs] = await Promise.all([
    getViewerStaffRecord(),
    getVehicleRequestList(),
    getVehicleLogList(),
  ]);
  const viewerEmail = (me?.['이메일(아이디)'] ?? '').toLowerCase();
  const logByRequestId = new Map(allLogs.filter((l) => l.신청ID).map((l) => [l.신청ID, l]));
  const currentYm = new Date().toISOString().slice(0, 7);
  const showAll = all === '1';
  const mineOnly = mine === '1';
  const activeYm = showAll ? '' : (ym || currentYm);

  const requests = allRequests
    .filter((r) => !mineOnly || (r.신청자이메일 ?? '').toLowerCase() === viewerEmail)
    .filter((r) => !activeYm || r.사용일자.startsWith(activeYm))
    .sort((a, b) => a.사용일자.localeCompare(b.사용일자) || (a.출발시간 || '').localeCompare(b.출발시간 || ''));

  const mineParam = mineOnly ? '&mine=1' : '';

  return (
    <div>
      {(deleted === '1' || seriesDeleted === '1') && (
        <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {seriesDeleted === '1' ? '이후 반복 예약을 전부 취소했습니다.' : '예약을 취소했습니다.'}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <a
          href={`/vehicles/requests?${mineParam.replace(/^&/, '')}`}
          className={`text-xs px-2.5 py-1 rounded-full ${!ym && !showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          이번달
        </a>
        <form method="get" className="flex items-center gap-1.5">
          {mineOnly && <input type="hidden" name="mine" value="1" />}
          <input type="month" name="ym" defaultValue={ym || currentYm} className={`${inputBase} w-auto text-xs py-1`} />
          <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
        </form>
        <a
          href={`/vehicles/requests?all=1${mineParam}`}
          className={`text-xs px-2.5 py-1 rounded-full ${showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          전체보기
        </a>

        <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

        <a
          href={`/vehicles/requests?${ym ? `ym=${ym}&` : ''}${showAll ? 'all=1&' : ''}${mineOnly ? '' : 'mine=1'}`}
          className={`text-xs px-2.5 py-1 rounded-full ${mineOnly ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          {mineOnly ? '내 신청만 보는 중 (전체 보기)' : '내 신청만 보기'}
        </a>
      </div>

      <div className={cardTableWrap}><table className={tableClean}>
        <thead>
          <tr>
            <th className={thClean}>사용일자</th><th className={thClean}>차량</th><th className={thClean}>신청자</th><th className={thClean}>시간</th>
            <th className={thClean}>목적</th><th className={thClean}>목적지</th><th className={thClean}>상태</th><th className={thClean}></th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr><td className={tdClean} colSpan={8}><span className="text-zinc-400">해당 조건에 맞는 신청 내역이 없습니다.</span></td></tr>
          ) : requests.map((r) => {
            const linkedLog = logByRequestId.get(r.id);
            const isMine = (r.신청자이메일 ?? '').toLowerCase() === viewerEmail;
            return (
              <tr key={r.id} className={trHoverClean}>
                <td className={tdClean}>{r.사용일자}</td>
                <td className={tdClean}>{r.차량번호}</td>
                <td className={tdClean}>{r.신청자명}</td>
                <td className={tdClean}>{r.출발시간 || '-'} ~ {r.복귀시간 || '-'}</td>
                <td className={tdClean}>{r.목적}</td>
                <td className={tdClean}>{r.목적지}</td>
                <td className={tdClean}>
                  {linkedLog ? (
                    <a href={`/vehicles/logs?edit=${linkedLog.id}#log-form`} className={`${badgeBase} ${badgeTone.green} hover:opacity-80`}>
                      작성완료
                    </a>
                  ) : hasVehicleUseEnded(r.사용일자, r.복귀시간) ? (
                    <a href={`/vehicles/logs?requestId=${r.id}#log-form`} className={`${badgeBase} ${badgeTone.red} hover:opacity-80`}>
                      일지작성
                    </a>
                  ) : (
                    <span className={`${badgeBase} ${badgeTone.gray}`}>예약됨</span>
                  )}
                </td>
                <td className={`${tdClean} flex gap-1.5`}>
                  {isMine && (
                    <>
                      <a href={`/vehicles?edit=${r.id}`} className={btnSecondary}>수정</a>
                      <form action={deleteVehicleRequestFormAction}>
                        <input type="hidden" name="id" value={r.id} />
                        {ym && <input type="hidden" name="ym" value={ym} />}
                        {showAll && <input type="hidden" name="all" value="1" />}
                        {mineOnly && <input type="hidden" name="mine" value="1" />}
                        <ConfirmSubmitButton confirmMessage="이 예약을 취소할까요?" className={btnDanger}>
                          {r.반복그룹ID ? '예약 취소(이 건만)' : '예약 취소'}
                        </ConfirmSubmitButton>
                      </form>
                      {r.반복그룹ID && (
                        <form action={deleteVehicleRequestSeriesFormAction}>
                          <input type="hidden" name="id" value={r.id} />
                          {ym && <input type="hidden" name="ym" value={ym} />}
                          {showAll && <input type="hidden" name="all" value="1" />}
                          {mineOnly && <input type="hidden" name="mine" value="1" />}
                          <ConfirmSubmitButton
                            confirmMessage="이 날짜 이후의 반복 예약을 전부 취소할까요?"
                            title="이 날짜 이후 반복 전체 취소"
                            className={btnSecondary}
                          >
                            이후 전체취소
                          </ConfirmSubmitButton>
                        </form>
                      )}
                    </>
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
