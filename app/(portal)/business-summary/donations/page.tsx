import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import ItemManageModal from '@/components/business/ItemManageModal';
import DonationSummaryTable from '@/components/business/DonationSummaryTable';
import DonationCashGridClient from '@/components/business/DonationCashGridClient';
import DonationGoodsGridClient from '@/components/business/DonationGoodsGridClient';
import { facilitiesFor, getModuleItems } from '@/lib/mutate/boardStat';
import {
  getDonationDetails, getDonationDetailsForYear, donationPriorCumulative, donationValueFor,
  DONATION_FACILITY_LABEL,
} from '@/lib/mutate/boardDonation';
import { btnOutline, btnSecondary, card, h2, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BusinessSummaryDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; facility?: string }>;
}) {
  if (!(await hasPageAccess('business-donations'))) return <PageAccessDenied />;

  const { ym: ymParam, facility: facilityParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  const year = ym.slice(0, 4);
  const facilities = facilitiesFor('후원');
  const 시설 = facilities.includes(facilityParam ?? '') ? (facilityParam as string) : facilities[0];

  const items = await getModuleItems('후원');

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

  const [cashDetails, goodsDetails] = await Promise.all([
    getDonationDetails('후원금', 시설, ym),
    getDonationDetails('후원물품', 시설, ym),
  ]);

  return (
    <>
      <BoardSubTabs ym={ym} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/donations/view?ym=${ym}`} className={btnOutline}>보기 전용 화면</Link>
      </div>

      <ItemManageModal 모듈="후원" items={items} />

      <DonationSummaryTable title={`1) 후원금 (${ym})`} rows={cashSummaryRows} note="전년 이월금 제외" />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="ym" value={ym} />
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">시설</label>
        <select name="facility" defaultValue={시설} className={`${inputBase} w-auto`}>
          {facilities.map((f) => (
            <option key={f} value={f}>{DONATION_FACILITY_LABEL[f] ?? f}</option>
          ))}
        </select>
        <button type="submit" className={btnSecondary}>선택</button>
      </form>

      <div className={`${card} mb-5`}>
        <h2 className={`${h2} mb-3`}>{DONATION_FACILITY_LABEL[시설] ?? 시설} 후원금 명단</h2>
        <DonationCashGridClient
          시설={시설} ym={ym}
          initialRows={cashDetails.map((d) => ({ id: d.id, 이름: d.이름, 금액: d.금액, 비고: d.비고 }))}
        />
      </div>

      <DonationSummaryTable title={`2) 후원물품(환가액) (${ym})`} rows={goodsSummaryRows} />

      <div className={card}>
        <h2 className={`${h2} mb-3`}>{DONATION_FACILITY_LABEL[시설] ?? 시설} 후원물품 명단</h2>
        <DonationGoodsGridClient
          시설={시설} ym={ym}
          initialRows={goodsDetails.map((d) => ({
            id: d.id, 이름: d.이름, 수량: d.수량, 금액: d.금액, 후원자: d.후원자, 지급대상: d.지급대상,
          }))}
        />
      </div>
    </>
  );
}
