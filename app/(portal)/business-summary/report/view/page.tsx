import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import { getBoardPlanEntries, getReportPeriod, type BoardPlanEntry, type BoardReportType } from '@/lib/mutate/boardPlan';
import { btnOutline, btnSecondary, card, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function ReadOnlySection({
  index,
  구분,
  period,
  entries,
}: {
  index: number;
  구분: BoardReportType;
  period: string;
  entries: BoardPlanEntry[];
}) {
  const columnLabel = 구분 === '사업보고' ? '성과' : '기대효과';

  return (
    <div className={card}>
      <h2 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">
        {index}. {구분}
        {period && <span className="ml-1 font-normal text-zinc-500">({period})</span>}
      </h2>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} w-40`}>사업명</th>
              <th className={`${th} w-28`}>실시월일</th>
              <th className={th}>내용</th>
              <th className={th}>{columnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td className={`${td} text-center text-zinc-400`} colSpan={4}>등록된 내용이 없습니다.</td></tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                <td className={`${td} whitespace-nowrap align-top font-medium`}>{e.사업명}</td>
                <td className={`${td} whitespace-nowrap align-top`}>{e.실시월일}</td>
                <td className={`${td} align-top whitespace-pre-wrap`}>{e.내용}</td>
                <td className={`${td} align-top whitespace-pre-wrap`}>{e.성과}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function BusinessSummaryReportViewPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-board-plan'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);

  const [사업보고, 사업계획, 사업보고기간, 사업계획기간] = await Promise.all([
    getBoardPlanEntries('사업보고', ym),
    getBoardPlanEntries('사업계획', ym),
    getReportPeriod('사업보고', ym),
    getReportPeriod('사업계획', ym),
  ]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/report?ym=${ym}`} className={btnOutline}>수정하기</Link>
      </div>
      <ReadOnlySection index={1} 구분="사업보고" period={사업보고기간} entries={사업보고} />
      <ReadOnlySection index={2} 구분="사업계획" period={사업계획기간} entries={사업계획} />
    </>
  );
}
