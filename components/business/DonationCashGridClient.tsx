'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnDanger, btnSecondary, table, td, th, tableWrap } from '@/lib/ui';
import { saveDonationDetailsAction } from '@/app/(portal)/business-summary/boardDonationActions';

type Row = { key: string; id?: string; 이름: string; 금액: string; 비고: string };

const cellInput =
  'w-full min-w-[6rem] rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none dark:bg-zinc-950';

export default function DonationCashGridClient({
  시설,
  ym,
  initialRows,
}: {
  시설: string;
  ym: string;
  initialRows: { id: string; 이름: string; 금액: number; 비고: string }[];
}) {
  const router = useRouter();
  const counterRef = useRef(0);
  const [rows, setRows] = useState<Row[]>(
    initialRows.map((r) => ({ key: r.id, id: r.id, 이름: r.이름, 금액: r.금액 ? String(r.금액) : '', 비고: r.비고 }))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function update(key: string, field: '이름' | '금액' | '비고', value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    counterRef.current += 1;
    setRows((prev) => [...prev, { key: `new-${counterRef.current}`, 이름: '', 금액: '', 비고: '' }]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = rows
          .filter((r) => r.이름.trim())
          .map((r) => ({ id: r.id, 이름: r.이름.trim(), 금액: Number(r.금액) || 0, 비고: r.비고.trim() }));
        await saveDonationDetailsAction('후원금', 시설, ym, payload);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <div>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} w-14 text-center`}>연번</th>
              <th className={th}>성 명</th>
              <th className={`${th} text-right`}>후원금액(원)</th>
              <th className={th}>비고</th>
              <th className={`${th} w-12`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className={`${td} text-center text-zinc-400`} colSpan={5}>등록된 명단이 없습니다.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td className={`${td} text-center tabular-nums text-zinc-400`}>{i + 1}</td>
                <td className={td}>
                  <input value={r.이름} onChange={(e) => update(r.key, '이름', e.target.value)} placeholder="성명" className={cellInput} />
                </td>
                <td className={td}>
                  <input
                    type="number" min="0" value={r.금액} onChange={(e) => update(r.key, '금액', e.target.value)}
                    placeholder="0" className={`${cellInput} text-right font-mono`}
                  />
                </td>
                <td className={td}>
                  <input value={r.비고} onChange={(e) => update(r.key, '비고', e.target.value)} className={cellInput} />
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
