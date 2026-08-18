import { card, table, td, th, tableWrap } from '@/lib/ui';
import type { RosterSummaryRow } from '@/lib/mutate/boardRoster';
import { ROSTER_GROUP_SHORT } from '@/lib/mutate/rosterConstants';

// 참고 서식의 "1) 총괄" 표 — 봉사분야를 좌우 2블록(각 4행)으로 나눠 단체/일반/소계를 보여준다.
// 편집화면(그리드 위)과 보기 전용 화면이 완전히 같은 모양을 써야 해서 공용 컴포넌트로 뺐다.
export default function RosterSummaryTable({
  title,
  rows,
}: {
  title: string;
  rows: RosterSummaryRow[];
}) {
  const half = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, half);
  const rightRows = rows.slice(half);
  const pairCount = Math.max(leftRows.length, rightRows.length);
  const label = ROSTER_GROUP_SHORT;

  const grand단체 = rows.reduce((a, r) => a + r.단체, 0);
  const grand일반 = rows.reduce((a, r) => a + r.일반, 0);
  const grand소계 = rows.reduce((a, r) => a + r.소계, 0);

  return (
    <div className={card}>
      <h2 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">{title}</h2>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th} rowSpan={2}>봉사분야</th>
              <th className={`${th} text-center`} colSpan={3}>참여인원</th>
              <th className={th} rowSpan={2}>비고</th>
              <th className={th} rowSpan={2}>봉사분야</th>
              <th className={`${th} text-center`} colSpan={3}>참여인원</th>
              <th className={th} rowSpan={2}>비고</th>
            </tr>
            <tr>
              <th className={`${th} text-right`}>{label}</th>
              <th className={`${th} text-right`}>일반</th>
              <th className={`${th} text-right`}>소계</th>
              <th className={`${th} text-right`}>{label}</th>
              <th className={`${th} text-right`}>일반</th>
              <th className={`${th} text-right`}>소계</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: pairCount }, (_, i) => [leftRows[i], rightRows[i]]).map(([l, r], i) => (
              <tr key={i} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                <td className={`${td} whitespace-nowrap`}>{l?.항목명 ?? ''}</td>
                <td className={`${td} text-right tabular-nums`}>{l ? l.단체 : ''}</td>
                <td className={`${td} text-right tabular-nums`}>{l ? l.일반 : ''}</td>
                <td className={`${td} text-right tabular-nums font-semibold`}>{l ? l.소계 : ''}</td>
                <td className={td} />
                <td className={`${td} whitespace-nowrap`}>{r?.항목명 ?? ''}</td>
                <td className={`${td} text-right tabular-nums`}>{r ? r.단체 : ''}</td>
                <td className={`${td} text-right tabular-nums`}>{r ? r.일반 : ''}</td>
                <td className={`${td} text-right tabular-nums font-semibold`}>{r ? r.소계 : ''}</td>
                <td className={td} />
              </tr>
            ))}
            <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
              <td className={`${td} whitespace-nowrap`} colSpan={2}>총 계</td>
              <td className={td} colSpan={8}>
                {grand소계}명 ({label} {grand단체}명, 일반 {grand일반}명)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
