'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { submitBudgetRowsAction } from '@/app/(portal)/business-summary/boardBudgetActions';
import type { BudgetRow } from '@/lib/mutate/boardBudgetExecution';

type EditRow = { 예산액: string; 집행액: string; 누계: string; 비고: string };

const numInput =
  'w-28 rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:bg-zinc-950';

// 예산액/집행액/누계/비고 전부 담당자가 직접 입력한다(수입지출현황 데이터에서 자동 계산하지 않음).
export default function BudgetAmountEntryClient({
  시설, ym, rows: initialRows,
}: {
  시설: string;
  ym: string;
  rows: BudgetRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, EditRow>>(
    Object.fromEntries(
      initialRows.map((r) => [
        r.항목ID,
        { 예산액: r.예산액 ? String(r.예산액) : '', 집행액: r.집행액 ? String(r.집행액) : '', 누계: r.누계 ? String(r.누계) : '', 비고: r.비고 },
      ])
    )
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function update(항목ID: string, field: keyof EditRow, value: string) {
    setRows((prev) => ({ ...prev, [항목ID]: { ...prev[항목ID], [field]: value } }));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = initialRows.map((r) => {
          const e = rows[r.항목ID];
          return {
            항목ID: r.항목ID,
            예산액: Number(e.예산액) || 0, 집행액: Number(e.집행액) || 0, 누계: Number(e.누계) || 0, 비고: e.비고,
          };
        });
        await submitBudgetRowsAction(시설, ym, payload);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <div>
      {/* 모바일: 표는 칸이 너무 좁아져서 대신 카드 목록으로 보여준다 */}
      <div className="flex flex-col gap-2 sm:hidden">
        {initialRows.length === 0 && <p className="text-center text-sm text-zinc-400">등록된 항목이 없습니다.</p>}
        {initialRows.map((r) => {
          const e = rows[r.항목ID];
          return (
            <div key={r.항목ID} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.항목명}</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  예산액(원)
                  <input type="number" min="0" placeholder="0" value={e.예산액} onChange={(ev) => update(r.항목ID, '예산액', ev.target.value)} className={`${numInput} w-full`} />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  집행액(원)
                  <input type="number" min="0" placeholder="0" value={e.집행액} onChange={(ev) => update(r.항목ID, '집행액', ev.target.value)} className={`${numInput} w-full`} />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  누계(원)
                  <input type="number" min="0" placeholder="0" value={e.누계} onChange={(ev) => update(r.항목ID, '누계', ev.target.value)} className={`${numInput} w-full`} />
                </label>
              </div>
              <label className="mt-1.5 flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                비고
                <input
                  value={e.비고} onChange={(ev) => update(r.항목ID, '비고', ev.target.value)}
                  className="w-full rounded border border-zinc-200 bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className={`${tableWrap} hidden sm:block`}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>항목</th>
              <th className={`${th} text-right`}>예산액(원)</th>
              <th className={`${th} text-right`}>집행액(원)</th>
              <th className={`${th} text-right`}>누계(원)</th>
              <th className={th}>비고</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 && (
              <tr><td className={`${td} text-center text-zinc-400`} colSpan={5}>등록된 항목이 없습니다.</td></tr>
            )}
            {initialRows.map((r) => {
              const e = rows[r.항목ID];
              return (
                <tr key={r.항목ID} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                  <td className={`${td} whitespace-nowrap`}>{r.항목명}</td>
                  <td className={td}>
                    <input type="number" min="0" placeholder="0" value={e.예산액} onChange={(ev) => update(r.항목ID, '예산액', ev.target.value)} className={numInput} />
                  </td>
                  <td className={td}>
                    <input type="number" min="0" placeholder="0" value={e.집행액} onChange={(ev) => update(r.항목ID, '집행액', ev.target.value)} className={numInput} />
                  </td>
                  <td className={td}>
                    <input type="number" min="0" placeholder="0" value={e.누계} onChange={(ev) => update(r.항목ID, '누계', ev.target.value)} className={numInput} />
                  </td>
                  <td className={td}>
                    <input
                      value={e.비고} onChange={(ev) => update(r.항목ID, '비고', ev.target.value)}
                      className="w-full rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none dark:bg-zinc-950"
                    />
                  </td>
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
