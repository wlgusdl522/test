'use client';

import { useState, useTransition } from 'react';
import { badgeBase, badgeTone, btnDanger, btnSecondary, card, cardTableWrap, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { deleteVehicleRequestAction } from '@/app/(portal)/vehicles/actions';
import { hasVehicleUseEnded } from '@/lib/vehicleTimeOverlap';

type Req = Record<string, string>;

function vehicleLabel(vehicleNo: string, vehicles: { 차량번호: string; 차종: string }[]): string {
  return vehicles.find((v) => v.차량번호 === vehicleNo)?.차종 ?? vehicleNo;
}

function StatusBadge({ r, date, hasLogRequestIds }: { r: Req; date: string; hasLogRequestIds: Set<string> }) {
  if (hasLogRequestIds.has(r.id)) {
    return <span className={`${badgeBase} ${badgeTone.green}`}>작성완료</span>;
  }
  if (hasVehicleUseEnded(r.사용일자 ?? date, r.복귀시간)) {
    return (
      <a href={`/vehicles/logs?requestId=${r.id}#log-form`} className={`${badgeBase} ${badgeTone.red} hover:opacity-80`}>
        일지작성
      </a>
    );
  }
  return <span className={`${badgeBase} ${badgeTone.gray}`}>예약됨</span>;
}

export default function VehicleDayDetailTable({
  date,
  requests,
  vehicles,
  hasLogRequestIds,
  viewerEmail,
  onEdit,
  onAdd,
  onMutated,
  showAddButton = false,
}: {
  date: string;
  requests: Req[];
  vehicles: { 차량번호: string; 차종: string }[];
  hasLogRequestIds: Set<string>;
  viewerEmail: string;
  onEdit: (id: string) => void;
  onAdd: (date: string) => void;
  onMutated: (freshRequests: Req[]) => void;
  showAddButton?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (!window.confirm('이 예약을 취소할까요?')) return;
    setDeletingId(id);
    setStatusText(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const result = await deleteVehicleRequestAction(fd);
      onMutated(result.requests);
      setDeletingId(null);
      setStatusText('예약을 취소했습니다.');
    });
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{date} 예약 현황</h3>
        <div className="flex items-center gap-3">
          {statusText && <span className="text-xs text-emerald-600 dark:text-emerald-400">{statusText}</span>}
          {showAddButton && (
            <button type="button" onClick={() => onAdd(date)} className="text-sm text-brand hover:underline">+ 예약</button>
          )}
        </div>
      </div>
      {requests.length === 0 ? (
        <p className="text-sm text-zinc-400">이 날짜에 등록된 예약이 없습니다.</p>
      ) : (
        <>
          {/* 모바일: 표는 칸이 너무 좁아져서 대신 카드 목록으로 보여준다 */}
          <div className="flex flex-col gap-2 sm:hidden">
            {requests.map((r) => {
              const isMine = (r.신청자이메일 ?? '').toLowerCase() === viewerEmail.toLowerCase();
              return (
                <div key={r.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {vehicleLabel(r.차량번호, vehicles)}
                    </span>
                    <StatusBadge r={r} date={date} hasLogRequestIds={hasLogRequestIds} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {r.신청자명} · {r.출발시간 || '-'} ~ {r.복귀시간 || '-'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {r.목적}
                    {r.목적지 && ` · ${r.목적지}`}
                  </p>
                  {isMine && (
                    <div className="mt-2 flex gap-1.5">
                      <button type="button" onClick={() => onEdit(r.id)} className={btnSecondary}>수정</button>
                      <button type="button" onClick={() => handleDelete(r.id)} disabled={isPending} className={btnDanger}>
                        {isPending && deletingId === r.id ? '취소 중...' : '예약 취소'}
                      </button>
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
                <th className={thClean}>차량</th><th className={thClean}>신청자</th><th className={thClean}>시간</th>
                <th className={thClean}>목적</th><th className={thClean}>목적지</th><th className={thClean}>상태</th><th className={thClean}></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const isMine = (r.신청자이메일 ?? '').toLowerCase() === viewerEmail.toLowerCase();
                return (
                  <tr key={r.id} className={trHoverClean}>
                    <td className={tdClean}>{vehicleLabel(r.차량번호, vehicles)}</td>
                    <td className={tdClean}>{r.신청자명}</td>
                    <td className={tdClean}>{r.출발시간 || '-'} ~ {r.복귀시간 || '-'}</td>
                    <td className={tdClean}>{r.목적}</td>
                    <td className={tdClean}>{r.목적지}</td>
                    <td className={tdClean}><StatusBadge r={r} date={date} hasLogRequestIds={hasLogRequestIds} /></td>
                    <td className={`${tdClean} flex gap-1.5`}>
                      {isMine && (
                        <>
                          <button type="button" onClick={() => onEdit(r.id)} className={btnSecondary}>수정</button>
                          <button type="button" onClick={() => handleDelete(r.id)} disabled={isPending} className={btnDanger}>
                            {isPending && deletingId === r.id ? '취소 중...' : '예약 취소'}
                          </button>
                        </>
                      )}
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
