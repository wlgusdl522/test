import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { badgeBase, badgeTone, btnDanger, btnSecondary, cardTableWrap, inputBase, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { deleteVehicleRequestFormAction, deleteVehicleRequestSeriesFormAction } from '@/app/(portal)/vehicles/actions';
import { hasVehicleUseEnded } from '@/lib/vehicleTimeOverlap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Req = Awaited<ReturnType<typeof getVehicleRequestList>>[number];

function StatusBadge({ r, linkedLogId }: { r: Req; linkedLogId?: string }) {
  if (linkedLogId) {
    return (
      <a href={`/vehicles/logs?edit=${linkedLogId}#log-form`} className={`${badgeBase} ${badgeTone.green} hover:opacity-80`}>
        작성완료
      </a>
    );
  }
  if (hasVehicleUseEnded(r.사용일자, r.복귀시간)) {
    return (
      <a href={`/vehicles/logs?requestId=${r.id}#log-form`} className={`${badgeBase} ${badgeTone.red} hover:opacity-80`}>
        일지작성
      </a>
    );
  }
  return <span className={`${badgeBase} ${badgeTone.gray}`}>예약됨</span>;
}

function RequestActions({
  r,
  ym,
  showAll,
  mineOnly,
}: {
  r: Req;
  ym?: string;
  showAll: boolean;
  mineOnly: boolean;
}) {
  return (
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
  );
}

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

      {requests.length === 0 ? (
        <p className="text-sm text-zinc-400">해당 조건에 맞는 신청 내역이 없습니다.</p>
      ) : (
        <>
          {/* 모바일: 표는 칸이 너무 좁아져서 대신 카드 목록으로 보여준다 */}
          <div className="flex flex-col gap-2 sm:hidden">
            {requests.map((r) => {
              const linkedLog = logByRequestId.get(r.id);
              const isMine = (r.신청자이메일 ?? '').toLowerCase() === viewerEmail;
              return (
                <div key={r.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.차량번호}</span>
                    <StatusBadge r={r} linkedLogId={linkedLog?.id} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {r.사용일자} · {r.신청자명}
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {r.출발시간 || '-'} ~ {r.복귀시간 || '-'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {r.목적}
                    {r.목적지 && ` · ${r.목적지}`}
                  </p>
                  {isMine && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <RequestActions r={r} ym={ym} showAll={showAll} mineOnly={mineOnly} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 데스크톱: 기존 표 레이아웃 유지 */}
          <div className={`hidden sm:block ${cardTableWrap}`}><table className={tableClean}>
            <thead>
              <tr>
                <th className={thClean}>사용일자</th><th className={thClean}>차량</th><th className={thClean}>신청자</th><th className={thClean}>시간</th>
                <th className={thClean}>목적</th><th className={thClean}>목적지</th><th className={thClean}>상태</th><th className={thClean}></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
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
                    <td className={tdClean}><StatusBadge r={r} linkedLogId={linkedLog?.id} /></td>
                    <td className={`${tdClean} flex gap-1.5`}>
                      {isMine && <RequestActions r={r} ym={ym} showAll={showAll} mineOnly={mineOnly} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </>
      )}
    </div>
  );
}
