import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import RosterSummaryTable from '@/components/business/RosterSummaryTable';
import { getModuleItems } from '@/lib/mutate/boardStat';
import { getRosterByItems, getRosterGroupLabel, summarizeRoster } from '@/lib/mutate/boardRoster';
import { btnOutline, btnSecondary, card, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function VolunteersViewPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-volunteers'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);

  const items = await getModuleItems('자원봉사자');
  const roster = await getRosterByItems(items.map((i) => i.id), ym);
  const groupLabel = await getRosterGroupLabel(ym);
  const rows = summarizeRoster(items, roster);
  const label = groupLabel || '단체';

  const grand단체 = rows.reduce((a, r) => a + r.단체, 0);
  const grand일반 = rows.reduce((a, r) => a + r.일반, 0);
  const grand소계 = rows.reduce((a, r) => a + r.소계, 0);
  const detailRows = rows.filter((r) => r.소계 > 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/volunteers?ym=${ym}`} className={btnOutline}>수정하기</Link>
      </div>

      <RosterSummaryTable title={`1) 총괄 (${ym})`} groupLabel={groupLabel} rows={rows} />

      <div className={card}>
        <h2 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">2) 분야별</h2>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th} rowSpan={2}>봉사분야</th>
                <th className={`${th} text-right`} rowSpan={2}>인원수(명)</th>
                <th className={`${th} text-center`} colSpan={2}>자원봉사자 명단</th>
              </tr>
              <tr>
                <th className={th}>{label}</th>
                <th className={th}>일반</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.length === 0 && (
                <tr><td className={`${td} text-center text-zinc-400`} colSpan={4}>등록된 명단이 없습니다.</td></tr>
              )}
              {detailRows.map((r) => (
                <tr key={r.id} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                  <td className={`${td} whitespace-nowrap align-top`}>{r.항목명}</td>
                  <td className={`${td} text-right tabular-nums align-top`}>{r.소계}</td>
                  <td className={`${td} align-top`}>{r.단체이름.join(' ')}</td>
                  <td className={`${td} align-top`}>{r.일반이름.join(' ')}</td>
                </tr>
              ))}
              <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                <td className={td}>합 계</td>
                <td className={`${td} text-right tabular-nums`}>{grand소계}</td>
                <td className={`${td} text-right tabular-nums`}>{grand단체}</td>
                <td className={`${td} text-right tabular-nums`}>{grand일반}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
