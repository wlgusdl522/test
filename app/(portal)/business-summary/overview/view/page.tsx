import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import AccountingSummaryTable from '@/components/business/AccountingSummaryTable';
import DonationSummaryTable from '@/components/business/DonationSummaryTable';
import {
  FACILITIES, FACILITY_LABEL, getModuleValues, priorCumulative, valueFor,
  OVERVIEW_SERVICE_HEADCOUNT_ITEM_ID, OVERVIEW_VOLUNTEER_HEADCOUNT_ITEM_ID,
} from '@/lib/mutate/boardStat';
import { getSummaryHighlights } from '@/lib/mutate/boardPlan';
import { getAccountingItems, computeFacilityTotals } from '@/lib/mutate/boardAccounting';
import { getBankAccounts } from '@/lib/mutate/boardBankAccount';
import { getDonationDetailsForYear, donationPriorCumulative, donationValueFor } from '@/lib/mutate/boardDonation';
import { getAdminNotes } from '@/lib/mutate/boardAdminNote';
import { btnOutline, btnSecondary, card, h2, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function HighlightTable({ title, rows }: { title: string; rows: { 사업명: string; 실시월일: string; 내용: string; 성과: string }[] }) {
  return (
    <div className={`${card} mb-5`}>
      <h2 className={`${h2} mb-3`}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">체크된 항목이 없습니다.</p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={`${th} w-40`}>사업명</th>
                <th className={`${th} w-28`}>실시월일</th>
                <th className={th}>내용</th>
                <th className={th}>성과/기대효과</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                  <td className={`${td} whitespace-nowrap align-top`}>{r.사업명}</td>
                  <td className={`${td} whitespace-nowrap align-top`}>{r.실시월일}</td>
                  <td className={`${td} align-top whitespace-pre-wrap`}>{r.내용}</td>
                  <td className={`${td} align-top whitespace-pre-wrap`}>{r.성과}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FacilityStatTable({ rows }: { rows: { 시설명: string; 전월누계: number; 금월실적: number }[] }) {
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

export default async function BusinessSummaryOverviewViewPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-overview'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  const year = ym.slice(0, 4);

  const [사업보고하이라이트, 사업계획하이라이트] = await Promise.all([
    getSummaryHighlights('사업보고', ym),
    getSummaryHighlights('사업계획', ym),
  ]);

  const [serviceValues, volunteerValues] = await Promise.all([
    getModuleValues([OVERVIEW_SERVICE_HEADCOUNT_ITEM_ID]),
    getModuleValues([OVERVIEW_VOLUNTEER_HEADCOUNT_ITEM_ID]),
  ]);
  const facilityRows = (itemId: string, values: typeof serviceValues) =>
    FACILITIES.map((f) => ({
      시설명: FACILITY_LABEL[f] ?? f,
      전월누계: priorCumulative(values, itemId, f, ym),
      금월실적: valueFor(values, itemId, f, ym),
    }));
  const serviceRows = facilityRows(OVERVIEW_SERVICE_HEADCOUNT_ITEM_ID, serviceValues);
  const volunteerRows = facilityRows(OVERVIEW_VOLUNTEER_HEADCOUNT_ITEM_ID, volunteerValues);

  const itemsByFacility = await Promise.all(FACILITIES.map((f) => getAccountingItems(f)));
  const allAccItems = itemsByFacility.flat();
  const allAccValues = await getModuleValues(allAccItems.map((i) => i.id));
  const accountingSummaryRows = FACILITIES.map((f) => ({
    시설명: FACILITY_LABEL[f] ?? f, ...computeFacilityTotals(allAccItems, allAccValues, f, ym),
  }));

  const accountsByFacility = await Promise.all(FACILITIES.map((f) => getBankAccounts(f)));
  const allAccounts = accountsByFacility.flat();
  const allAccountValues = await getModuleValues(allAccounts.map((a) => a.id));
  const 예금잔액총액 = allAccounts.reduce((sum, a) => sum + valueFor(allAccountValues, a.id, a.시설, ym), 0);

  const [현금연간, 물품연간] = await Promise.all([
    Promise.all(FACILITIES.map((f) => getDonationDetailsForYear('후원금', f, year))),
    Promise.all(FACILITIES.map((f) => getDonationDetailsForYear('후원물품', f, year))),
  ]);
  const cashSummaryRows = FACILITIES.map((f, i) => {
    const 전월누계 = donationPriorCumulative(현금연간[i], '후원금', f, ym);
    const 금월실적 = donationValueFor(현금연간[i], '후원금', f, ym);
    return { 시설명: FACILITY_LABEL[f] ?? f, 전월누계, 금월실적, 누계: 전월누계 + 금월실적 };
  });
  const goodsSummaryRows = FACILITIES.map((f, i) => {
    const 전월누계 = donationPriorCumulative(물품연간[i], '후원물품', f, ym);
    const 금월실적 = donationValueFor(물품연간[i], '후원물품', f, ym);
    return { 시설명: FACILITY_LABEL[f] ?? f, 전월누계, 금월실적, 누계: 전월누계 + 금월실적 };
  });

  const adminNotes = await getAdminNotes(ym);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/overview?ym=${ym}`} className={btnOutline}>수정하기</Link>
      </div>

      <HighlightTable title="1) 사업보고" rows={사업보고하이라이트} />
      <HighlightTable title="2) 사업계획" rows={사업계획하이라이트} />

      <div className={`${card} mb-5`}>
        <h2 className={`${h2} mb-3`}>3) 서비스 제공 인원 현황 ({ym})</h2>
        <FacilityStatTable rows={serviceRows} />
      </div>

      <div className={`${card} mb-5`}>
        <h2 className={`${h2} mb-3`}>4) 자원봉사자 현황 요약 ({ym})</h2>
        <FacilityStatTable rows={volunteerRows} />
      </div>

      <AccountingSummaryTable title={`5) ${ym} 수입지출현황`} rows={accountingSummaryRows} />

      <div className={`${card} mb-5`}>
        <h2 className={`${h2} mb-3`}>6) 예금잔액</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          총 <span className="font-semibold tabular-nums">{nf(예금잔액총액)}</span>원 ({ym} 기준)
        </p>
      </div>

      <DonationSummaryTable title={`7-1) 후원금 (${ym})`} rows={cashSummaryRows} note="전년 이월금 제외" />
      <DonationSummaryTable title={`7-2) 후원물품(환가액) (${ym})`} rows={goodsSummaryRows} />

      <div className={card}>
        <h2 className={`${h2} mb-3`}>8) 행정사항 ({ym})</h2>
        {adminNotes.length === 0 ? (
          <p className="text-sm text-zinc-400">등록된 행정사항이 없습니다.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-800 dark:text-zinc-200">
            {adminNotes.map((n) => <li key={n.id}>{n.내용}</li>)}
          </ol>
        )}
      </div>
    </>
  );
}
