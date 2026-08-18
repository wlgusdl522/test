import { table, td, th, tableWrap } from '@/lib/ui';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

// 시설별 전월누계/금월실적/누계 보기 전용 표 — FacilityStatEntryClient의 읽기 전용 버전.
export default function FacilityStatTable({ rows }: { rows: { 시설명: string; 전월누계: number; 금월실적: number }[] }) {
  return (
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
          {rows.map((r) => (
            <tr key={r.시설명} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
              <td className={`${td} whitespace-nowrap`}>{r.시설명}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(r.전월누계)}</td>
              <td className={`${td} text-right tabular-nums`}>{nf(r.금월실적)}</td>
              <td className={`${td} text-right tabular-nums font-semibold`}>{nf(r.전월누계 + r.금월실적)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
