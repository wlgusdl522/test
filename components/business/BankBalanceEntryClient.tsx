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
      <div className={tableWrap}>
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
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
