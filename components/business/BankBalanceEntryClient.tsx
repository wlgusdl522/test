'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { submitBankBalanceValuesAction } from '@/app/(portal)/business-summary/boardAccountingActions';

type Account = { id: string; 은행명: string; 계좌번호: string; 비고: string };

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

export default function BankBalanceEntryClient({
  시설, ym, accounts, initialValues,
}: {
  시설: string;
  ym: string;
  accounts: Account[];
  initialValues: Record<string, number>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(accounts.map((a) => [a.id, initialValues[a.id] ? String(initialValues[a.id]) : '']))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  const 소계 = accounts.reduce((sum, a) => sum + (Number(values[a.id]) || 0), 0);

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const entries = accounts.map((a) => ({ 항목ID: a.id, 값: Number(values[a.id]) || 0 }));
        await submitBankBalanceValuesAction(시설, ym, entries);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:hidden">
        {accounts.length === 0 && <p className="text-center text-sm text-zinc-400">등록된 계좌가 없습니다.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{a.은행명}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{a.계좌번호}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <label className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">잔액(원)</label>
              <input
                type="number" min="0" placeholder="0"
                value={values[a.id] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [a.id]: e.target.value }))}
                className="w-full rounded border border-zinc-200 bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            {a.비고 && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{a.비고}</p>}
          </div>
        ))}
        {accounts.length > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-[#eef1f5] p-3 font-semibold dark:border-zinc-700 dark:bg-zinc-800">
            <span className="text-sm">소계</span>
            <span className="text-sm tabular-nums">{nf(소계)}</span>
          </div>
        )}
      </div>
      <div className={`${tableWrap} hidden sm:block`}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>은행명</th>
              <th className={th}>계좌번호</th>
              <th className={`${th} text-right`}>잔액(원)</th>
              <th className={th}>비고</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr><td className={`${td} text-center text-zinc-400`} colSpan={4}>등록된 계좌가 없습니다.</td></tr>
            )}
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className={`${td} whitespace-nowrap`}>{a.은행명}</td>
                <td className={`${td} whitespace-nowrap`}>{a.계좌번호}</td>
                <td className={td}>
                  <input
                    type="number" min="0" placeholder="0"
                    value={values[a.id] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    className="w-36 rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
                <td className={td}>{a.비고}</td>
              </tr>
            ))}
            {accounts.length > 0 && (
              <tr>
                <td className={`${td} font-semibold`} colSpan={2}>소계</td>
                <td className={`${td} text-right font-mono font-semibold tabular-nums`}>{nf(소계)}</td>
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
