'use client';

import { useTransition } from 'react';
import { btnDanger, btnSecondary, card, table, tableWrap, td, th } from '@/lib/ui';
import { deleteVehicleRequestAction } from '@/app/(portal)/vehicles/actions';

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
  onMutated: () => void;
  showAddButton?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      await deleteVehicleRequestAction(fd);
      onMutated();
    });
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{date} 예약 현황</h3>
        {showAddButton && (
          <button type="button" onClick={() => onAdd(date)} className="text-sm text-brand hover:underline">+ 예약</button>
        )}
      </div>
      {requests.length === 0 ? (
        <p className="text-sm text-zinc-400">이 날짜에 등록된 예약이 없습니다.</p>
      ) : (
        <div className={tableWrap}><table className={table}>
          <thead>
            <tr>
              <th className={th}>차량</th><th className={th}>신청자</th><th className={th}>시간</th>
              <th className={th}>목적</th><th className={th}>목적지</th><th className={th}>상태</th><th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const isMine = (r.신청자이메일 ?? '').toLowerCase() === viewerEmail.toLowerCase();
              return (
                <tr key={r.id}>
                  <td className={td}>{vehicleLabel(r.차량번호, vehicles)}</td>
                  <td className={td}>{r.신청자명}</td>
                  <td className={td}>{r.출발시간 || '-'} ~ {r.복귀시간 || '-'}</td>
                  <td className={td}>{r.목적}</td>
                  <td className={td}>{r.목적지}</td>
                  <td className={td}>{hasLogRequestIds.has(r.id) ? '운행완료' : '예약됨'}</td>
                  <td className={`${td} flex gap-1.5`}>
                    {isMine && (
                      <>
                        <button type="button" onClick={() => onEdit(r.id)} className={btnSecondary}>수정</button>
                        <button type="button" onClick={() => handleDelete(r.id)} disabled={isPending} className={btnDanger}>삭제</button>
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
