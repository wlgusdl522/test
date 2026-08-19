'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { submitBudgetAmountsAction } from '@/app/(portal)/business-summary/boardBudgetActions';
import type { BudgetExecutionRow } from '@/lib/mutate/boardBudgetExecution';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');
const pct = (v: number | null) => (v === null ? '–' : v.toFixed(1));

export default function BudgetAmountEntryClient({
  시설, year, rows: initialRows,
}: {
  시설: string;
  year: string;
  rows: BudgetExecutionRow[];
}) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(initialRows.map((r) => [r.카테고리, r.예산액 ? String(r.예산액) : '']))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = Object.fromEntries(initialRows.map((r) => [r.카테고리, Number(amounts[r.카테고리]) || 0]));
        await submitBudgetAmountsAction(시설, year, payload);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  const totalBudget = initialRows.reduce((a, r) => a + (Number(amounts[r.카테고리]) || 0), 0);
  const totalExec = initialRows.reduce((a, r) => a + r.집행액, 0);
  const totalCum = initialRows.reduce((a, r) => a + r.누계, 0);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:hidden">
        {initialRows.map((r) => (
          <div key={r.카테고리} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.카테고리}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                집행률 {pct(Number(amounts[r.카테고리]) > 0 ? (r.누계 / Number(amounts[r.카테고리])) * 100 : null)}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <label className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">예산액(원)</label>
              <input
                type="number" min="0" placeholder="0"
                value={amounts[r.카테고리] ?? ''}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [r.카테고리]: e.target.value }))}
                className="w-full rounded border border-zinc-200 bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              집행액 {nf(r.집행액)} · 누계 {nf(r.누계)}
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-zinc-300 bg-[#eef1f5] p-3 font-semibold dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">총 계</span>
            <span className="text-sm">{pct(totalBudget > 0 ? (totalCum / totalBudget) * 100 : null)}%</span>
          </div>
          <p className="mt-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            예산 {nf(totalBudget)} · 집행 {nf(totalExec)} · 누계 {nf(totalCum)}
          </p>
        </div>
      </div>
      <div className={`${tableWrap} hidden sm:block`}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>항목</th>
              <th className={`${th} text-right`}>예산액(원)</th>
              <th className={`${th} text-right`}>집행액(원)</th>
              <th className={`${th} text-right`}>누계(원)</th>
              <th className={`${th} text-right`}>집행률(%)</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.map((r) => (
              <tr key={r.카테고리} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                <td className={`${td} whitespace-nowrap`}>{r.카테고리}</td>
                <td className={td}>
                  <input
                    type="number" min="0" placeholder="0"
                    value={amounts[r.카테고리] ?? ''}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [r.카테고리]: e.target.value }))}
                    className="w-32 rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
                <td className={`${td} text-right tabular-nums`}>{nf(r.집행액)}</td>
                <td className={`${td} text-right tabular-nums font-semibold`}>{nf(r.누계)}</td>
                <td className={`${td} text-right tabular-nums`}>
                  {pct(Number(amounts[r.카테고리]) > 0 ? (r.누계 / Number(amounts[r.카테고리])) * 100 : null)}
                </td>
              </tr>
            ))}
            <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
              <td className={td}>총 계</td>
              <td className={`${td} text-right tabular-nums`}>{nf(totalBudget)}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(totalExec)}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(totalCum)}</td>
              <td className={`${td} text-right tabular-nums`}>{pct(totalBudget > 0 ? (totalCum / totalBudget) * 100 : null)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>예산액 저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
