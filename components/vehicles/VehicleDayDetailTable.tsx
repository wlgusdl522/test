'use client';

import { useState, useTransition } from 'react';
import { badgeBase, badgeTone, btnDanger, btnSecondary, card, cardTableWrap, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { deleteVehicleRequestAction } from '@/app/(portal)/vehicles/actions';
import { hasVehicleUseEnded } from '@/lib/vehicleTimeOverlap';

type Req = Record<string, string>;

function vehicleLabel(vehicleNo: string, vehicles: { 차량번호: string; 차종: string }[]): string {
  return vehicles.find((v) => v.차량번호 === vehicleNo)?.차종 ?? vehicleNo;
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
        <div className={cardTableWrap}><table className={tableClean}>
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
                  <td className={tdClean}>
                    {hasLogRequestIds.has(r.id) ? (
                      <span className={`${badgeBase} ${badgeTone.green}`}>작성완료</span>
                    ) : hasVehicleUseEnded(r.사용일자 ?? date, r.복귀시간) ? (
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
      )}
    </div>
  );
}
