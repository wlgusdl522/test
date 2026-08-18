'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { btn, btnDanger, btnSecondary, inputBase } from '@/lib/ui';
import { saveRosterAction } from '@/app/(portal)/business-summary/boardStatActions';

type Person = { key: string; id?: string; 구분: string; 이름: string };

export default function BoardRosterModal({
  항목ID,
  항목명,
  ym,
  initialRoster,
  onClose,
}: {
  항목ID: string;
  항목명: string;
  ym: string;
  initialRoster: { id: string; 구분: string; 이름: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const counterRef = useRef(0);
  const [people, setPeople] = useState<Person[]>(
    initialRoster.map((p) => ({ key: p.id, id: p.id, 구분: p.구분, 이름: p.이름 }))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function update(key: string, field: '구분' | '이름', value: string) {
    setPeople((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  }

  function addPerson() {
    counterRef.current += 1;
    setPeople((prev) => [...prev, { key: `new-${counterRef.current}`, 구분: '', 이름: '' }]);
  }

  function removePerson(key: string) {
    setPeople((prev) => prev.filter((p) => p.key !== key));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = people
          .filter((p) => p.이름.trim())
          .map((p) => ({ id: p.id, 구분: p.구분.trim(), 이름: p.이름.trim() }));
        await saveRosterAction(항목ID, ym, payload);
        setStatus('저장했습니다');
        router.refresh();
        onClose();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <Modal title={`${항목명} 명단 (${ym})`} onClose={onClose}>
      <div className="mb-3 flex text-xs font-semibold text-zinc-500">
        <span className="w-32">구분(단체명)</span>
        <span className="flex-1">이름</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {people.length === 0 && <p className="text-sm text-zinc-400">등록된 명단이 없습니다.</p>}
        {people.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <input
              value={p.구분} onChange={(e) => update(p.key, '구분', e.target.value)}
              placeholder="일반" className={`${inputBase} w-32`}
            />
            <input
              value={p.이름} onChange={(e) => update(p.key, '이름', e.target.value)}
              placeholder="이름" className={`${inputBase} flex-1`}
            />
            <button type="button" onClick={() => removePerson(p.key)} className={btnDanger}>삭제</button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={addPerson} className={btnSecondary}>+ 인원 추가</button>
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </Modal>
  );
}
