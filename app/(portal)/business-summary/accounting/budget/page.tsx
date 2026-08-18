import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import BoardSubTabs from '@/components/business/BoardSubTabs';
import BudgetAmountEntryClient from '@/components/business/BudgetAmountEntryClient';
import { FACILITIES, FACILITY_LABEL, getModuleValues } from '@/lib/mutate/boardStat';
import { getAccountingItems } from '@/lib/mutate/boardAccounting';
import { getBudgetAmounts, getBudgetExecutionRows } from '@/lib/mutate/boardBudgetExecution';
import { btnOutline, btnSecondary, card, h2, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function AccountingBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; facility?: string }>;
}) {
  if (!(await hasPageAccess('business-accounting'))) return <PageAccessDenied />;

  const { ym: ymParam, facility: facilityParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);
  const year = ym.slice(0, 4);
  const 시설 = FACILITIES.includes((facilityParam ?? '') as (typeof FACILITIES)[number]) ? (facilityParam as string) : FACILITIES[0];

  const items = await getAccountingItems(시설);
  const expenseItems = items.filter((i) => i.구분 === '지출');
  const values = await getModuleValues(expenseItems.map((i) => i.id));
  const budgetAmounts = await getBudgetAmounts(시설, year);
  const rows = getBudgetExecutionRows(expenseItems, values, budgetAmounts, 시설, ym);

  return (
    <>
      <BoardSubTabs />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/business-summary/accounting?ym=${ym}&facility=${시설}`} className={btnOutline}>수입지출현황</Link>
        <span className={`${btnOutline} pointer-events-none bg-brand-tint`}>예산집행현황</span>
      </div>

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

      <div className={card}>
        <h2 className={`${h2} mb-3`}>{FACILITY_LABEL[시설] ?? 시설} · {year}년 예산집행현황 ({ym} 기준)</h2>
        <p className="mb-3 text-xs text-zinc-400">
          집행액/누계는 수입지출현황의 지출 데이터에서 자동 계산됩니다. 예산액만 입력하면 됩니다.
          &quot;사업비&quot;는 기본사업비/특정보조사업비 세부분류 전이라 지금은 한 항목으로 합쳐서 보여줍니다.
        </p>
        <BudgetAmountEntryClient 시설={시설} year={year} rows={rows} />
      </div>
    </>
  );
}
