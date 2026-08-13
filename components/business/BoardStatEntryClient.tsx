'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { submitBoardStatValuesAction } from '@/app/(portal)/business-summary/boardStatActions';

type Row = { id: string; 항목명: string; 전월누계: number; 금월실적: number };

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

export default function BoardStatEntryClient({ ym, rows }: { ym: string; rows: Row[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.id, r.금월실적 ? String(r.금월실적) : '']))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-400">등록된 항목이 없습니다. 위에서 항목을 먼저 추가해주세요.</p>;
  }

  function handleSubmit() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const entries = rows.map((r) => ({ 항목ID: r.id, 값: Number(values[r.id]) || 0 }));
        await submitBoardStatValuesAction(ym, entries);
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
              <th className={`${th} whitespace-nowrap`}>항목</th>
              <th className={`${th} text-right`}>전월누계</th>
              <th className={`${th} text-right`}>금월실적</th>
              <th className={`${th} text-right`}>누계</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const current = Number(values[r.id]) || 0;
              return (
                <tr key={r.id} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                  <td className={`${td} text-left whitespace-nowrap`}>{r.항목명}</td>
                  <td className={`${td} text-right tabular-nums text-zinc-400`}>{nf(r.전월누계)}</td>
                  <td className={td}>
                    <input
                      type="number" min="0" placeholder="0"
                      value={values[r.id] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="w-28 rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:bg-zinc-950"
                    />
                  </td>
                  <td className={`${td} text-right tabular-nums font-semibold`}>{nf(r.전월누계 + current)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={handleSubmit} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
