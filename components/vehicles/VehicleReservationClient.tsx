'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, input, inputBase, label } from '@/lib/ui';
import Modal from '@/components/Modal';
import VehicleSelectWithFuelWarning from '@/components/vehicles/VehicleSelectWithFuelWarning';
import VehicleRequestCalendar from '@/components/vehicles/VehicleRequestCalendar';
import VehicleWeekCalendar from '@/components/vehicles/VehicleWeekCalendar';
import VehicleDayDetailTable from '@/components/vehicles/VehicleDayDetailTable';
import VehicleViewSwitch from '@/components/vehicles/VehicleViewSwitch';
import TimeSelect10Min from '@/components/vehicles/TimeSelect10Min';
import { addVehicleRequestAction, updateVehicleRequestAction } from '@/app/(portal)/vehicles/actions';

type Req = Record<string, string>;
type View = 'month' | 'week' | 'day';

const WEEKDAYS = [
  { value: 0, label: '일' }, { value: 1, label: '월' }, { value: 2, label: '화' },
  { value: 3, label: '수' }, { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' },
];

export default function VehicleReservationClient({
  initialView,
  initialDate,
  initialEditId,
  initialNew,
  requests,
  vehicles,
  hasLogRequestIds,
  fuelWarningByVehicle,
  viewerEmail,
}: {
  initialView: View;
  initialDate: string;
  initialEditId: string;
  initialNew: boolean;
  requests: Req[];
  vehicles: { 차량번호: string; 차종: string }[];
  hasLogRequestIds: string[];
  fuelWarningByVehicle: Record<string, boolean>;
  viewerEmail: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
  const [anchorDate, setAnchorDate] = useState(initialDate);
  const [weekSelectedDate, setWeekSelectedDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(initialEditId || null);
  const [prefillDate, setPrefillDate] = useState<string | null>(initialNew ? initialDate : null);
  const [formOpen, setFormOpen] = useState(!!initialEditId || initialNew);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const logIdSet = useMemo(() => new Set(hasLogRequestIds), [hasLogRequestIds]);
  const editing = editingId ? requests.find((r) => r.id === editingId) ?? null : null;

  function openNew(date: string) {
    setEditingId(null);
    setPrefillDate(date);
    setFormError(null);
    setSuccessMessage(null);
    setFormOpen(true);
  }
  function openEdit(id: string) {
    setEditingId(id);
    setPrefillDate(null);
    setFormError(null);
    setSuccessMessage(null);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
  }
  function handleViewChange(v: View) {
    setView(v);
    setWeekSelectedDate(null);
  }
  function handleNavigate(iso: string) {
    setAnchorDate(iso);
    setWeekSelectedDate(null);
  }
  function handleMutated() {
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const wasEditing = !!editingId;
    if (wasEditing) fd.set('id', editingId as string);
    setFormError(null);
    startTransition(async () => {
      try {
        const result = wasEditing
          ? await updateVehicleRequestAction(fd)
          : await addVehicleRequestAction(fd);
        setFormOpen(false);
        // 방금 만든(또는 수정한) 예약이 바로 눈에 보이도록, 그 날짜로 화면을 옮긴다.
        // 반복 신청이면 실제로 첫 회차가 등록된 날짜로 이동 — 처음 입력한 날짜가 반복 요일과
        // 안 맞으면 그 날짜엔 아무것도 안 만들어져서 "신청했는데 아무것도 안 보인다"로 이어졌었다.
        setAnchorDate(result.date);
        setWeekSelectedDate(null);
        setSuccessMessage(
          wasEditing
            ? '수정했습니다.'
            : result.count > 1
              ? `${result.count}건 등록했습니다 (${result.date}부터).`
              : '신청했습니다.'
        );
        router.refresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : '신청 중 오류가 발생했습니다.');
      }
    });
  }

  const monthRequests = requests.filter((r) => r.사용일자 === anchorDate);
  const weekDetailRequests = weekSelectedDate ? requests.filter((r) => r.사용일자 === weekSelectedDate) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <VehicleViewSwitch view={view} onChange={handleViewChange} />
        <div className="flex items-center gap-3">
          {successMessage && <span className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</span>}
          <button type="button" onClick={() => openNew(anchorDate)} className={btn}>예약하기</button>
        </div>
      </div>

      {view === 'month' && (
        <>
          <VehicleRequestCalendar
            date={anchorDate}
            requests={requests}
            vehicles={vehicles}
            hasLogRequestIds={logIdSet}
            onSelectDate={setAnchorDate}
            onNavigate={handleNavigate}
          />
          <VehicleDayDetailTable
            date={anchorDate}
            requests={monthRequests}
            vehicles={vehicles}
            hasLogRequestIds={logIdSet}
            viewerEmail={viewerEmail}
            onEdit={openEdit}
            onAdd={openNew}
            onMutated={handleMutated}
            showAddButton={false}
          />
        </>
      )}

      {view === 'week' && (
        <>
          <VehicleWeekCalendar
            date={anchorDate}
            selectedDate={weekSelectedDate}
            requests={requests}
            vehicles={vehicles}
            hasLogRequestIds={logIdSet}
            onSelectDate={setWeekSelectedDate}
            onNavigate={handleNavigate}
          />
          {weekSelectedDate && (
            <div className="mt-4">
              <VehicleDayDetailTable
                date={weekSelectedDate}
                requests={weekDetailRequests}
                vehicles={vehicles}
                hasLogRequestIds={logIdSet}
                viewerEmail={viewerEmail}
                onEdit={openEdit}
                onAdd={openNew}
                onMutated={handleMutated}
                showAddButton
              />
            </div>
          )}
        </>
      )}

      {view === 'day' && (
        <VehicleDayDetailTable
          date={anchorDate}
          requests={monthRequests}
          vehicles={vehicles}
          hasLogRequestIds={logIdSet}
          viewerEmail={viewerEmail}
          onEdit={openEdit}
          onAdd={openNew}
          onMutated={handleMutated}
          showAddButton={false}
        />
      )}

      {formOpen && (
        <Modal title={editing ? '신청 수정' : '신규 신청'} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <label className={label}>
              차량 *
              <VehicleSelectWithFuelWarning
                vehicles={vehicles}
                defaultValue={editing?.차량번호 ?? ''}
                fuelWarningByVehicle={fuelWarningByVehicle}
              />
            </label>
            <label className={label}>
              사용일자 *
              <input type="date" name="date" defaultValue={editing?.사용일자 ?? prefillDate ?? anchorDate} required className={input} />
            </label>
            <label className={label}>
              출발시간
              <TimeSelect10Min name="startTime" defaultValue={editing?.출발시간 ?? ''} />
            </label>
            <label className={label}>
              복귀시간
              <TimeSelect10Min name="endTime" defaultValue={editing?.복귀시간 ?? ''} />
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
              동승 인원(명)
              <input type="number" name="companions" min={0} defaultValue={editing?.동승자 ?? ''} className={input} />
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
                    반복 종료일 <input type="date" name="untilDate" className={`${inputBase} inline-block w-auto`} />
                  </label>
                </div>
              </div>
            )}

            {formError && (
              <div className="col-span-2 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="col-span-2 flex items-center gap-3">
              <button type="submit" disabled={isPending} className={btn}>{isPending ? '저장 중...' : editing ? '저장' : '신청'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
