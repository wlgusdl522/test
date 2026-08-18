import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import AccountingItemManageModal from '@/components/business/AccountingItemManageModal';
import AccountingEntryClient from '@/components/business/AccountingEntryClient';
import AccountingSummaryTable from '@/components/business/AccountingSummaryTable';
import BankAccountManageModal from '@/components/business/BankAccountManageModal';
import BankBalanceEntryClient from '@/components/business/BankBalanceEntryClient';
import { FACILITIES, FACILITY_LABEL, getModuleValues } from '@/lib/mutate/boardStat';
import { getAccountingItems, suggestCarryForward, computeFacilityTotals } from '@/lib/mutate/boardAccounting';
import { getBankAccounts } from '@/lib/mutate/boardBankAccount';
import { btnOutline, btnSecondary, card, h2, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BusinessSummaryAccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; facility?: string }>;
}) {
  if (!(await hasPageAccess('business-accounting'))) return <PageAccessDenied />;

  const { ym: ymParam, facility: facilityParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  const 시설 = FACILITIES.includes((facilityParam ?? '') as (typeof FACILITIES)[number]) ? (facilityParam as string) : FACILITIES[0];

  const itemsByFacility = await Promise.all(FACILITIES.map((f) => getAccountingItems(f)));
  const allItems = itemsByFacility.flat();
  const allValues = await getModuleValues(allItems.map((i) => i.id));

  const summaryRows = FACILITIES.map((f, i) => {
    const totals = computeFacilityTotals(allItems, allValues, f, ym);
    return { 시설명: FACILITY_LABEL[f] ?? f, ...totals };
  });

  const items = itemsByFacility[FACILITIES.indexOf(시설 as (typeof FACILITIES)[number])];
  const income = items.filter((i) => i.구분 === '수입');
  const expense = items.filter((i) => i.구분 === '지출');
  const values = await getModuleValues(items.map((i) => i.id));
  const initialValues = Object.fromEntries(
    items.map((i) => [i.id, values.find((v) => v.항목ID === i.id && v.시설 === 시설 && v.년월 === ym)?.값 ?? 0])
  );
  const carrySuggestion = suggestCarryForward(allItems, allValues, 시설, ym);

  const accounts = await getBankAccounts(시설);
  const accountValues = await getModuleValues(accounts.map((a) => a.id));
  const accountInitialValues = Object.fromEntries(
    accounts.map((a) => [a.id, accountValues.find((v) => v.항목ID === a.id && v.시설 === 시설 && v.년월 === ym)?.값 ?? 0])
  );

  return (
    <>
      <BoardSubTabs />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`${btnOutline} pointer-events-none bg-brand-tint`}>수입지출현황</span>
        <Link href={`/business-summary/accounting/budget?ym=${ym}&facility=${시설}`} className={btnOutline}>예산집행현황</Link>
      </div>
      <AccountingSummaryTable title={`5) ${ym} 수입지출현황`} rows={summaryRows} />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">시설</label>
        <select name="facility" defaultValue={시설} className={`${inputBase} w-auto`}>
          {FACILITIES.map((f) => (
            <option key={f} value={f}>{FACILITY_LABEL[f] ?? f}</option>
          ))}
        </select>
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <AccountingItemManageModal 시설={시설} items={items} />

      <div className={`${card} mb-5`}>
        <h2 className={`${h2} mb-3`}>{FACILITY_LABEL[시설] ?? 시설} · {ym} 수입지출 입력</h2>
        <AccountingEntryClient
          시설={시설} ym={ym} income={income} expense={expense}
          initialValues={initialValues} suggestedCarryForward={carrySuggestion}
        />
      </div>

      <BankAccountManageModal 시설={시설} accounts={accounts} />

      <div className={card}>
        <h2 className={`${h2} mb-3`}>6) {FACILITY_LABEL[시설] ?? 시설} · {ym} 예금잔액명세</h2>
        <BankBalanceEntryClient 시설={시설} ym={ym} accounts={accounts} initialValues={accountInitialValues} />
      </div>
    </>
  );
}
