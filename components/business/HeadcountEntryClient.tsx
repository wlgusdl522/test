'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { submitHeadcountValuesAction } from '@/app/(portal)/business-summary/boardHeadcountActions';

type Row = { id: string; 항목명: string; 실인원: number; 비고: string };
type EditRow = { 실인원: string; 비고: string };

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

export default function HeadcountEntryClient({ ym, rows: initialRows }: { ym: string; rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, EditRow>>(
    Object.fromEntries(initialRows.map((r) => [r.id, { 실인원: r.실인원 ? String(r.실인원) : '', 비고: r.비고 }]))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  const 합계 = initialRows.reduce((a, r) => a + (Number(rows[r.id]?.실인원) || 0), 0);

  function update(id: string, field: keyof EditRow, value: string) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = initialRows.map((r) => ({
          항목ID: r.id, 실인원: Number(rows[r.id]?.실인원) || 0, 비고: rows[r.id]?.비고 ?? '',
        }));
        await submitHeadcountValuesAction(ym, payload);
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
        {initialRows.map((r) => (
          <div key={r.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.항목명}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <label className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">실인원(명)</label>
              <input
                type="number" min="0" value={rows[r.id]?.실인원 ?? ''} onChange={(e) => update(r.id, '실인원', e.target.value)}
                placeholder="0" className="w-full rounded border border-zinc-200 bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <label className="mt-1.5 flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              비고
              <input
                value={rows[r.id]?.비고 ?? ''} onChange={(e) => update(r.id, '비고', e.target.value)}
                className="w-full rounded border border-zinc-200 bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>
        ))}
        {initialRows.length > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-[#eef1f5] p-3 font-semibold dark:border-zinc-700 dark:bg-zinc-800">
            <span className="text-sm">합 계</span>
            <span className="text-sm font-mono">{nf(합계)}</span>
          </div>
        )}
      </div>

      <div className={`${tableWrap} hidden sm:block`}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>사업 구분</th>
              <th className={`${th} w-24 text-right`}>실인원(명)</th>
              <th className={th}>비고</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 && (
              <tr><td className={`${td} text-center text-zinc-400`} colSpan={3}>등록된 항목이 없습니다.</td></tr>
            )}
            {initialRows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap`}>{r.항목명}</td>
                <td className={td}>
                  <input
                    type="number" min="0" value={rows[r.id]?.실인원 ?? ''} onChange={(e) => update(r.id, '실인원', e.target.value)}
                    placeholder="0" className="w-full rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
                <td className={td}>
                  <input
                    value={rows[r.id]?.비고 ?? ''} onChange={(e) => update(r.id, '비고', e.target.value)}
                    className="w-full rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
              </tr>
            ))}
            {initialRows.length > 0 && (
              <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                <td className={td}>합 계</td>
                <td className={`${td} text-right font-mono`}>{nf(합계)}</td>
                <td className={td} />
              </tr>
            )}
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
