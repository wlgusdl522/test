'use client';

import { useEffect, useRef, useState } from 'react';
import ItemManageModal from '@/components/staffMeeting/ItemManageModal';
import TeamOrderModal from '@/components/staffMeeting/TeamOrderModal';
import type { StaffMeetingItem } from '@/lib/mutate/staffMeeting';
import { btnSecondary } from '@/lib/ui';

const MENU_ITEM_BUTTON =
  'block w-full rounded px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800';

type ActiveModal = 'order' | 'items' | null;

// 발표순서 관리/사업구분 관리는 매달 자주 누르는 버튼이 아니라 설정성
// 기능이라, 각자 outline 버튼으로 늘어놓는 대신 "⚙️ 회의 설정" 드롭다운 하나로 묶는다.
// 모달을 드롭다운 메뉴 안에서 직접 열면(=메뉴가 닫히며 그 안의 컴포넌트가 통째로
// 언마운트) 모달이 뜰 새도 없이 같이 사라지므로, 어떤 모달을 열지는 이 컴포넌트가
// 별도 상태(activeModal)로 들고 메뉴 바깥에서 렌더링한다.
export default function MeetingSettingsMenu({
  orderedTeams,
  팀명,
  items,
}: {
  orderedTeams: string[];
  팀명: string;
  items: StaffMeetingItem[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function openModal(modal: Exclude<ActiveModal, null>) {
    setActiveModal(modal);
    setMenuOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button type="button" onClick={() => setMenuOpen((o) => !o)} className={btnSecondary}>
        ⚙️ 회의 설정 ▾
      </button>
      {menuOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 flex w-52 flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <button type="button" className={MENU_ITEM_BUTTON} onClick={() => openModal('order')}>
            발표순서 관리
          </button>
          {팀명 && (
            <button type="button" className={MENU_ITEM_BUTTON} onClick={() => openModal('items')}>
              사업구분 관리
            </button>
          )}
        </div>
      )}

      {activeModal === 'order' && (
        <TeamOrderModal teams={orderedTeams} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'items' && 팀명 && (
        <ItemManageModal 팀명={팀명} items={items} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}
