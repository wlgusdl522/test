'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { btn, btnSecondary, input, label } from '@/lib/ui';
import { saveMeetingMetaAction } from '@/app/(portal)/weekly-plan/meeting/actions';

type MeetingMeta = {
  회의시간?: string;
  회의장소?: string;
  공지사항?: string;
  휴가및일정?: string;
  슈퍼비전?: string;
};

export default function MeetingInfoSection({
  team,
  date,
  meta,
}: {
  team: string;
  date: string;
  meta: MeetingMeta | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [time, setTime] = useState(meta?.회의시간 ?? '');
  const [place, setPlace] = useState(meta?.회의장소 ?? '');
  const [notice, setNotice] = useState(meta?.공지사항 ?? '');
  const [leave, setLeave] = useState(meta?.휴가및일정 ?? '');
  const [supervision, setSupervision] = useState(meta?.슈퍼비전 ?? '');
  const [statusText, setStatusText] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setStatusText('저장 중...');
    startTransition(async () => {
      try {
        await saveMeetingMetaAction({ team, date, time, place, notice, leave, supervision });
        setStatusText('저장 완료');
        setIsOpen(false);
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={btnSecondary}>
        회의정보입력
      </button>

      {isOpen && (
        <Modal title="회의정보 입력" onClose={() => setIsOpen(false)}>
          <div className="flex flex-col gap-3">
            <label className={label}>
              회의시간
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
            </label>
            <label className={label}>
              회의장소
              <input value={place} onChange={(e) => setPlace(e.target.value)} className={input} />
            </label>
            <label className={label}>
              공지사항
              <textarea value={notice} onChange={(e) => setNotice(e.target.value)} className={input} rows={3} />
            </label>
            <label className={label}>
              휴가 및 일정
              <textarea value={leave} onChange={(e) => setLeave(e.target.value)} className={input} rows={2} />
            </label>
            <label className={label}>
              슈퍼비전
              <textarea value={supervision} onChange={(e) => setSupervision(e.target.value)} className={input} rows={2} />
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
