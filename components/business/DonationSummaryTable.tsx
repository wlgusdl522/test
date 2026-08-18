import { card, table, td, th, tableWrap } from '@/lib/ui';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

export default function DonationSummaryTable({
  title,
  rows,
  note,
}: {
  title: string;
  rows: { 시설명: string; 전월누계: number; 금월실적: number; 누계: number }[];
  note?: string;
}) {
  const 합계전월 = rows.reduce((a, r) => a + r.전월누계, 0);
  const 합계금월 = rows.reduce((a, r) => a + r.금월실적, 0);
  const 합계누계 = rows.reduce((a, r) => a + r.누계, 0);

  return (
    <div className={`${card} mb-5`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-bold text-brand-dark dark:text-brand">{title}</h2>
        <span className="text-xs text-zinc-400">(단위: 원)</span>
      </div>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>시설명</th>
              <th className={`${th} text-right`}>전월 누계</th>
              <th className={`${th} text-right`}>금월 실적</th>
              <th className={`${th} text-right`}>누 계</th>
              <th className={th}>비 고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.시설명} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                <td className={`${td} whitespace-nowrap`}>{r.시설명}</td>
                <td className={`${td} text-right tabular-nums`}>{nf(r.전월누계)}</td>
                <td className={`${td} text-right tabular-nums`}>{nf(r.금월실적)}</td>
                <td className={`${td} text-right tabular-nums font-semibold`}>{nf(r.누계)}</td>
                <td className={td} />
              </tr>
            ))}
            <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
              <td className={td}>합 계</td>
              <td className={`${td} text-right tabular-nums`}>{nf(합계전월)}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(합계금월)}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(합계누계)}</td>
              <td className={`${td} text-xs font-normal text-zinc-500`}>{note}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
