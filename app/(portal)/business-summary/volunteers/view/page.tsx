import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import { getModuleItems } from '@/lib/mutate/boardStat';
import { getRosterByItems } from '@/lib/mutate/boardRoster';
import { btnOutline, btnSecondary, card, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

type Bucket = { 단체: number; 일반: number; 소계: number; 단체이름: string[]; 일반이름: string[] };

function emptyBucket(): Bucket {
  return { 단체: 0, 일반: 0, 소계: 0, 단체이름: [], 일반이름: [] };
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

  // 실제로 쓰인 구분(단체명) 값 중 가장 많이 등장한 것 하나를 대표 단체명 열로 쓴다 —
  // 보통 특정 협력단체 하나(예: 새문안교회)만 있고 나머지는 일반이라, 이 정도면 참고 서식과 동일하게 나온다.
  const groupCount = new Map<string, number>();
  for (const r of roster) {
    const g = r.구분.trim();
    if (g) groupCount.set(g, (groupCount.get(g) ?? 0) + 1);
  }
  const 대표단체명 = [...groupCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  const rows = items.map((i) => {
    const bucket = emptyBucket();
    for (const r of roster) {
      if (r.항목ID !== i.id) continue;
      const g = r.구분.trim();
      if (g) {
        bucket.단체 += 1;
        bucket.단체이름.push(r.이름);
      } else {
        bucket.일반 += 1;
        bucket.일반이름.push(r.이름);
      }
    }
    bucket.소계 = bucket.단체 + bucket.일반;
    return { id: i.id, 항목명: i.항목명, ...bucket };
  });

  const half = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, half);
  const rightRows = rows.slice(half);
  const pairCount = Math.max(leftRows.length, rightRows.length);

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

      <div className={`${card} mb-5`}>
        <h2 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">1) 총괄 ({ym})</h2>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={`${th}`} rowSpan={2}>봉사분야</th>
                <th className={`${th} text-center`} colSpan={3}>참여인원</th>
                <th className={th} rowSpan={2}>비고</th>
                <th className={`${th}`} rowSpan={2}>봉사분야</th>
                <th className={`${th} text-center`} colSpan={3}>참여인원</th>
                <th className={th} rowSpan={2}>비고</th>
              </tr>
              <tr>
                <th className={`${th} text-right`}>{대표단체명 || '단체'}</th>
                <th className={`${th} text-right`}>일반</th>
                <th className={`${th} text-right`}>소계</th>
                <th className={`${th} text-right`}>{대표단체명 || '단체'}</th>
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
                  {grand소계}명 ({대표단체명 || '단체'} {grand단체}명, 일반 {grand일반}명)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
                <th className={th}>{대표단체명 || '단체'}</th>
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
