import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import { getModuleItems, getModuleValues, valueFor } from '@/lib/mutate/boardStat';
import { getHeadcountDate } from '@/lib/mutate/boardHeadcount';
import { btnOutline, btnSecondary, card, h2, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BusinessSummaryHeadcountViewPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-headcount'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);

  const [items, headcountDate] = await Promise.all([getModuleItems('실인원'), getHeadcountDate(ym)]);
  const values = await getModuleValues(items.map((i) => i.id));
  const rows = items.map((i) => ({
    id: i.id, 항목명: i.항목명,
    실인원: valueFor(values, i.id, '전체', ym),
    비고: values.find((v) => v.항목ID === i.id && v.시설 === '전체' && v.년월 === ym)?.비고 ?? '',
  }));
  const 합계 = rows.reduce((a, r) => a + r.실인원, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/headcount?ym=${ym}`} className={btnOutline}>수정하기</Link>
      </div>

      <div className={card}>
        <h2 className={`${h2} mb-3`}>실인원 산출내역 ({ym}{headcountDate ? `, ${headcountDate} 기준` : ''})</h2>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>사업 구분</th>
                <th className={`${th} text-right`}>실인원(명)</th>
                <th className={th}>비고</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td className={`${td} text-center text-zinc-400`} colSpan={3}>등록된 항목이 없습니다.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                  <td className={`${td} whitespace-nowrap`}>{r.항목명}</td>
                  <td className={`${td} text-right tabular-nums`}>{nf(r.실인원)}</td>
                  <td className={td}>{r.비고}</td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                  <td className={td}>합 계</td>
                  <td className={`${td} text-right tabular-nums`}>{nf(합계)}</td>
                  <td className={td} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
