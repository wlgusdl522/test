'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { btn, btnSecondary, input, label } from '@/lib/ui';
import { saveStaffMeetingInfoAction } from '@/app/(portal)/staff-meeting/actions';

type MeetingInfo = {
  회의일시?: string;
  장소?: string;
  진행?: string;
  참석부서?: string;
  업무보고기간?: string;
  업무계획기간?: string;
};

export default function StaffMeetingInfoSection({
  ym,
  meta,
  canEdit,
}: {
  ym: string;
  meta: MeetingInfo | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dateTime, setDateTime] = useState(meta?.회의일시 ?? '');
  const [place, setPlace] = useState(meta?.장소 ?? '');
  const [host, setHost] = useState(meta?.진행 ?? '');
  const [teams, setTeams] = useState(meta?.참석부서 ?? '');
  const [reportPeriod, setReportPeriod] = useState(meta?.업무보고기간 ?? '');
  const [planPeriod, setPlanPeriod] = useState(meta?.업무계획기간 ?? '');
  const [statusText, setStatusText] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setStatusText('저장 중...');
    const formData = new FormData();
    formData.append('년월', ym);
    formData.append('회의일시', dateTime);
    formData.append('장소', place);
    formData.append('진행', host);
    formData.append('참석부서', teams);
    formData.append('업무보고기간', reportPeriod);
    formData.append('업무계획기간', planPeriod);

    startTransition(async () => {
      try {
        await saveStaffMeetingInfoAction(formData);
        setStatusText('저장 완료');
        setIsOpen(false);
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  if (!canEdit) return null;

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={btnSecondary}>
        회의정보관리
      </button>

      {isOpen && (
        <Modal title="회의정보 관리" onClose={() => setIsOpen(false)}>
          <div className="flex flex-col gap-3">
            <label className={label}>
              회의일시
              <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className={input} />
            </label>
            <label className={label}>
              회의장소
              <input value={place} onChange={(e) => setPlace(e.target.value)} className={input} />
            </label>
            <label className={label}>
              진행
              <input value={host} onChange={(e) => setHost(e.target.value)} className={input} />
            </label>
            <label className={label}>
              참석부서
              <textarea value={teams} onChange={(e) => setTeams(e.target.value)} className={input} rows={2} />
            </label>
            <label className={label}>
              업무보고기간
              <input value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)} className={input} />
            </label>
            <label className={label}>
              업무계획기간
              <input value={planPeriod} onChange={(e) => setPlanPeriod(e.target.value)} className={input} />
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSave} disabled={isPending} className={btn}>
                {isPending ? '저장 중...' : '저장'}
              </button>
              {statusText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
