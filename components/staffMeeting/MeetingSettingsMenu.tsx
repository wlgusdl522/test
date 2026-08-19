'use client';

import { useEffect, useRef, useState } from 'react';
import FormToggle from '@/components/FormToggle';
import ItemManageModal from '@/components/staffMeeting/ItemManageModal';
import TeamOrderModal from '@/components/staffMeeting/TeamOrderModal';
import type { StaffMeetingItem } from '@/lib/mutate/staffMeeting';
import { btnOutline } from '@/lib/ui';

const MENU_ITEM_BUTTON =
  'block w-full rounded px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800';

// 회의정보 관리/발표순서 관리/사업구분 관리는 매달 자주 누르는 버튼이 아니라 설정성
// 기능이라, 각자 outline 버튼으로 늘어놓는 대신 "⚙️ 회의 설정" 드롭다운 하나로 묶는다.
export default function MeetingSettingsMenu({
  canEditInfo,
  meetingInfoForm,
  orderedTeams,
  팀명,
  items,
}: {
  canEditInfo: boolean;
  meetingInfoForm: React.ReactNode;
  orderedTeams: string[];
  팀명: string;
  items: StaffMeetingItem[];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className={btnOutline}>
        ⚙️ 회의 설정 ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 flex w-52 flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {canEditInfo && (
            <FormToggle
              label="회의정보 관리"
              buttonLabel="회의정보 관리"
              buttonClassName={MENU_ITEM_BUTTON}
              wrapperClassName=""
              onOpen={closeMenu}
            >
              {meetingInfoForm}
            </FormToggle>
          )}
          <TeamOrderModal teams={orderedTeams} buttonClassName={MENU_ITEM_BUTTON} onOpen={closeMenu} />
          {팀명 && <ItemManageModal 팀명={팀명} items={items} buttonClassName={MENU_ITEM_BUTTON} onOpen={closeMenu} />}
        </div>
      )}
    </div>
  );
}
