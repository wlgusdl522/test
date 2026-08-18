'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { saveRosterAction } from '@/app/(portal)/business-summary/boardStatActions';

const cellInput =
  'w-full min-w-[10rem] resize-y rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13px] leading-relaxed focus:border-brand focus:outline-none dark:bg-zinc-950';

function splitNames(text: string): string[] {
  return text.split(/\s+/).map((s) => s.trim()).filter(Boolean);
}

export default function BoardRosterGridClient({
  items,
  ym,
  groupLabel,
}: {
  items: { id: string; 항목명: string; 단체이름: string[]; 일반이름: string[] }[];
  ym: string;
  groupLabel: string;
}) {
  const router = useRouter();
  const [texts, setTexts] = useState<Record<string, { 단체: string; 일반: string }>>(
    Object.fromEntries(items.map((i) => [i.id, { 단체: i.단체이름.join('\n'), 일반: i.일반이름.join('\n') }]))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function update(id: string, field: '단체' | '일반', value: string) {
    setTexts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const rows: { 항목ID: string; 구분: string; 이름: string }[] = [];
        for (const i of items) {
          const t = texts[i.id];
          splitNames(t.단체).forEach((이름) => rows.push({ 항목ID: i.id, 구분: groupLabel, 이름 }));
          splitNames(t.일반).forEach((이름) => rows.push({ 항목ID: i.id, 구분: '', 이름 }));
        }
        await saveRosterAction(items.map((i) => i.id), ym, rows);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">등록된 항목이 없습니다. 위에서 항목을 먼저 추가해주세요.</p>;
  }

  return (
    <div>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} w-36`} rowSpan={2}>봉사분야</th>
              <th className={`${th} text-center`} colSpan={2}>자원봉사자 명단</th>
            </tr>
            <tr>
              <th className={th}>{groupLabel || '단체'}</th>
              <th className={th}>일반</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td className={`${td} whitespace-nowrap align-top font-medium`}>{i.항목명}</td>
                <td className={`${td} align-top`}>
                  <textarea
                    value={texts[i.id]?.단체 ?? ''} onChange={(e) => update(i.id, '단체', e.target.value)}
                    rows={3} placeholder="이름을 띄어쓰기/줄바꿈으로 구분해 입력" className={cellInput}
                  />
                </td>
                <td className={`${td} align-top`}>
                  <textarea
                    value={texts[i.id]?.일반 ?? ''} onChange={(e) => update(i.id, '일반', e.target.value)}
                    rows={3} placeholder="이름을 띄어쓰기/줄바꿈으로 구분해 입력" className={cellInput}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
