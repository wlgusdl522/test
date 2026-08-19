'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { submitFacilityStatAction } from '@/app/(portal)/business-summary/boardOverviewActions';

type Row = { 시설: string; 시설명: string; 전월누계: number; 금월실적: number };

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

// 회계/후원처럼 세부 항목이 여러 개가 아니라 시설별로 숫자 하나만 매달 입력하면 되는
// 항목(서비스 제공 인원 현황, 자원봉사자 현황 요약) 공용 입력표.
export default function FacilityStatEntryClient({
  항목ID, ym, rows: initialRows,
}: {
  항목ID: string;
  ym: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initialRows.map((r) => [r.시설, r.금월실적 ? String(r.금월실적) : '']))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const entries = initialRows.map((r) => ({ 시설: r.시설, 값: Number(values[r.시설]) || 0 }));
        await submitFacilityStatAction(항목ID, ym, entries);
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
              <th className={th}>시설명</th>
              <th className={`${th} text-right`}>전월 누계</th>
              <th className={`${th} text-right`}>금월 실적</th>
              <th className={`${th} text-right`}>누 계</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.map((r) => {
              const current = Number(values[r.시설]) || 0;
              return (
                <tr key={r.시설} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                  <td className={`${td} whitespace-nowrap`}>{r.시설명}</td>
                  <td className={`${td} text-right tabular-nums text-zinc-400`}>{nf(r.전월누계)}</td>
                  <td className={td}>
                    <input
                      type="number" min="0" placeholder="0"
                      value={values[r.시설] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [r.시설]: e.target.value }))}
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
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
