import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import DonationSummaryTable from '@/components/business/DonationSummaryTable';
import { facilitiesFor } from '@/lib/mutate/boardStat';
import {
  getDonationDetails, getDonationDetailsForYear, donationPriorCumulative, donationValueFor,
  DONATION_FACILITY_LABEL,
} from '@/lib/mutate/boardDonation';
import { btnOutline, btnSecondary, card, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

export default async function DonationsViewPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-donations'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  const year = ym.slice(0, 4);
  const facilities = facilitiesFor('후원');

  const [cashDetailsAll, goodsDetailsAll] = await Promise.all([
    Promise.all(facilities.map((f) => getDonationDetails('후원금', f, ym))),
    Promise.all(facilities.map((f) => getDonationDetails('후원물품', f, ym))),
  ]);
  const [현금연간, 물품연간] = await Promise.all([
    Promise.all(facilities.map((f) => getDonationDetailsForYear('후원금', f, year))),
    Promise.all(facilities.map((f) => getDonationDetailsForYear('후원물품', f, year))),
  ]);

  const cashSummaryRows = facilities.map((f, i) => {
    const 전월누계 = donationPriorCumulative(현금연간[i], '후원금', f, ym);
    const 금월실적 = donationValueFor(현금연간[i], '후원금', f, ym);
    return { 시설명: DONATION_FACILITY_LABEL[f] ?? f, 전월누계, 금월실적, 누계: 전월누계 + 금월실적 };
  });
  const goodsSummaryRows = facilities.map((f, i) => {
    const 전월누계 = donationPriorCumulative(물품연간[i], '후원물품', f, ym);
    const 금월실적 = donationValueFor(물품연간[i], '후원물품', f, ym);
    return { 시설명: DONATION_FACILITY_LABEL[f] ?? f, 전월누계, 금월실적, 누계: 전월누계 + 금월실적 };
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/donations?ym=${ym}`} className={btnOutline}>수정하기</Link>
      </div>

      <DonationSummaryTable title={`1) 후원금 (${ym})`} rows={cashSummaryRows} note="전년 이월금 제외" />

      {facilities.map((f, i) => {
        const rows = cashDetailsAll[i];
        if (rows.length === 0) return null;
        const total = rows.reduce((a, r) => a + r.금액, 0);
        return (
          <div key={f} className={`${card} mb-5`}>
            <h3 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">
              {i + 1}) {DONATION_FACILITY_LABEL[f] ?? f}
            </h3>
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={`${th} w-14 text-center`}>연번</th>
                    <th className={th}>성 명</th>
                    <th className={`${th} text-right`}>후원금액(원)</th>
                    <th className={th}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                      <td className={`${td} text-center tabular-nums text-zinc-400`}>{idx + 1}</td>
                      <td className={td}>{r.이름}</td>
                      <td className={`${td} text-right tabular-nums`}>{nf(r.금액)}</td>
                      <td className={td}>{r.비고}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                    <td className={td} colSpan={2}>합 계</td>
                    <td className={`${td} text-right tabular-nums`}>{nf(total)}</td>
                    <td className={td} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <DonationSummaryTable title={`2) 후원물품(환가액) (${ym})`} rows={goodsSummaryRows} />

      {facilities.map((f, i) => {
        const rows = goodsDetailsAll[i];
        if (rows.length === 0) return null;
        const total = rows.reduce((a, r) => a + r.금액, 0);
        return (
          <div key={f} className={`${card} mb-5`}>
            <h3 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">
              {i + 1}) {DONATION_FACILITY_LABEL[f] ?? f}
            </h3>
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={`${th} w-14 text-center`}>연번</th>
                    <th className={th}>후원품</th>
                    <th className={`${th} text-right`}>수량</th>
                    <th className={`${th} text-right`}>환가액(원)</th>
                    <th className={th}>후원자</th>
                    <th className={th}>지급대상</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                      <td className={`${td} text-center tabular-nums text-zinc-400`}>{idx + 1}</td>
                      <td className={td}>{r.이름}</td>
                      <td className={`${td} text-right tabular-nums`}>{r.수량}</td>
                      <td className={`${td} text-right tabular-nums`}>{nf(r.금액)}</td>
                      <td className={td}>{r.후원자}</td>
                      <td className={td}>{r.지급대상}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                    <td className={td} colSpan={3}>합 계</td>
                    <td className={`${td} text-right tabular-nums`}>{nf(total)}</td>
                    <td className={td} colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
