'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnDanger, btnSecondary, inputBase, table, td, th, tableWrap } from '@/lib/ui';
import { saveRosterAction } from '@/app/(portal)/business-summary/boardStatActions';

type Row = { key: string; id?: string; 항목ID: string; 구분: string; 이름: string };

export default function BoardRosterTableClient({
  items,
  ym,
  initialRows,
}: {
  items: { id: string; 항목명: string }[];
  ym: string;
  initialRows: { id: string; 항목ID: string; 구분: string; 이름: string }[];
}) {
  const router = useRouter();
  const counterRef = useRef(0);
  const [rows, setRows] = useState<Row[]>(
    initialRows.map((r) => ({ key: r.id, id: r.id, 항목ID: r.항목ID, 구분: r.구분, 이름: r.이름 }))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function update(key: string, field: '항목ID' | '구분' | '이름', value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    counterRef.current += 1;
    setRows((prev) => [...prev, { key: `new-${counterRef.current}`, 항목ID: items[0]?.id ?? '', 구분: '', 이름: '' }]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = rows
          .filter((r) => r.이름.trim() && r.항목ID)
          .map((r) => ({ id: r.id, 항목ID: r.항목ID, 구분: r.구분.trim(), 이름: r.이름.trim() }));
        await saveRosterAction(items.map((i) => i.id), ym, payload);
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
              <th className={`${th} w-44`}>봉사분야</th>
              <th className={`${th} w-36`}>구분(단체명)</th>
              <th className={th}>이름</th>
              <th className={`${th} w-12`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className={`${td} text-center text-zinc-400`} colSpan={4}>등록된 명단이 없습니다. 아래 &quot;행 추가&quot;로 시작하세요.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.key}>
                <td className={td}>
                  <select value={r.항목ID} onChange={(e) => update(r.key, '항목ID', e.target.value)} className={`${inputBase} w-full`}>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.항목명}</option>
                    ))}
                  </select>
                </td>
                <td className={td}>
                  <input
                    value={r.구분} onChange={(e) => update(r.key, '구분', e.target.value)}
                    placeholder="일반" className={`${inputBase} w-full`}
                  />
                </td>
                <td className={td}>
                  <input
                    value={r.이름} onChange={(e) => update(r.key, '이름', e.target.value)}
                    placeholder="이름" className={`${inputBase} w-full`}
                  />
                </td>
                <td className={`${td} text-center`}>
                  <button type="button" onClick={() => removeRow(r.key)} className={btnDanger}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={addRow} className={btnSecondary}>+ 행 추가</button>
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
