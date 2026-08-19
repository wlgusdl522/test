import { card, table, td, th, tableWrap } from '@/lib/ui';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

export default function AccountingSummaryTable({
  title,
  rows,
}: {
  title: string;
  rows: { 시설명: string; 전월잔액: number; 금월수입: number; 금월지출: number; 잔액: number }[];
}) {
  const 합계전월 = rows.reduce((a, r) => a + r.전월잔액, 0);
  const 합계수입 = rows.reduce((a, r) => a + r.금월수입, 0);
  const 합계지출 = rows.reduce((a, r) => a + r.금월지출, 0);
  const 합계잔액 = rows.reduce((a, r) => a + r.잔액, 0);

  return (
    <div className={`${card} mb-5`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-bold text-brand-dark dark:text-brand">{title}</h2>
        <span className="text-xs text-zinc-400">(단위: 원)</span>
      </div>
      <div className="flex flex-col gap-2 sm:hidden">
        {rows.map((r) => (
          <div key={r.시설명} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.시설명}</span>
              <span className="text-sm font-semibold tabular-nums">{nf(r.잔액)}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              전월잔액 {nf(r.전월잔액)} · 금월수입 {nf(r.금월수입)} · 금월지출 {nf(r.금월지출)}
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-zinc-300 bg-[#eef1f5] p-3 font-semibold dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">합 계</span>
            <span className="text-sm tabular-nums">{nf(합계잔액)}</span>
          </div>
          <p className="mt-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            전월잔액 {nf(합계전월)} · 금월수입 {nf(합계수입)} · 금월지출 {nf(합계지출)}
          </p>
        </div>
      </div>
      <div className={`${tableWrap} hidden sm:block`}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>시설명</th>
              <th className={`${th} text-right`}>전월잔액</th>
              <th className={`${th} text-right`}>금월수입</th>
              <th className={`${th} text-right`}>금월지출</th>
              <th className={`${th} text-right`}>잔 액</th>
              <th className={th}>비 고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.시설명} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                <td className={`${td} whitespace-nowrap`}>{r.시설명}</td>
                <td className={`${td} text-right tabular-nums`}>{nf(r.전월잔액)}</td>
                <td className={`${td} text-right tabular-nums`}>{nf(r.금월수입)}</td>
                <td className={`${td} text-right tabular-nums`}>{nf(r.금월지출)}</td>
                <td className={`${td} text-right tabular-nums font-semibold`}>{nf(r.잔액)}</td>
                <td className={td} />
              </tr>
            ))}
            <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
              <td className={td}>합 계</td>
              <td className={`${td} text-right tabular-nums`}>{nf(합계전월)}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(합계수입)}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(합계지출)}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(합계잔액)}</td>
              <td className={td} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
