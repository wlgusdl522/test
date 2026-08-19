import Link from 'next/link';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import AccountingSummaryTable from '@/components/business/AccountingSummaryTable';
import { FACILITIES, FACILITY_LABEL, getModuleValues, valueFor, type BoardStatValue } from '@/lib/mutate/boardStat';
import { getAccountingItems, computeFacilityTotals, type AccountingItem } from '@/lib/mutate/boardAccounting';
import { getBankAccounts } from '@/lib/mutate/boardBankAccount';
import { getBudgetItems, getBudgetRows } from '@/lib/mutate/boardBudgetExecution';
import { btnOutline, btnSecondary, card, h2, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

type SectionRow = { groupLabel: string | null; rowSpan: number; itemLabel: string; value: number };

function buildSectionRows(items: AccountingItem[], values: BoardStatValue[], 시설: string, ym: string): SectionRow[] {
  const groups = new Map<string, AccountingItem[]>();
  for (const it of items) {
    if (!groups.has(it.그룹)) groups.set(it.그룹, []);
    groups.get(it.그룹)!.push(it);
  }
  const rows: SectionRow[] = [];
  for (const [그룹, groupItems] of groups) {
    const groupSum = groupItems.reduce((a, i) => a + valueFor(values, i.id, 시설, ym), 0);
    if (groupItems.length === 1) {
      rows.push({ groupLabel: 그룹, rowSpan: 1, itemLabel: '', value: groupSum });
    } else {
      rows.push({ groupLabel: 그룹, rowSpan: groupItems.length + 1, itemLabel: '계', value: groupSum });
      groupItems.forEach((it) => rows.push({ groupLabel: null, rowSpan: 0, itemLabel: it.항목명, value: valueFor(values, it.id, 시설, ym) }));
    }
  }
  return rows;
}

function Section({ title, rows }: { title: string; rows: SectionRow[] }) {
  return (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr>
            <th className={`${th} text-center`} colSpan={2}>{title}</th>
            <th className={`${th} text-right`}>금액(원)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className={`${td} text-center text-zinc-400`} colSpan={3}>등록된 항목이 없습니다.</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              {r.groupLabel !== null && (
                <td className={`${td} whitespace-nowrap font-semibold`} rowSpan={r.rowSpan}>{r.groupLabel}</td>
              )}
              <td className={`${td} whitespace-nowrap ${r.itemLabel === '계' ? 'font-semibold' : ''}`}>{r.itemLabel}</td>
              <td className={`${td} text-right font-mono tabular-nums ${r.itemLabel === '계' ? 'font-semibold' : ''}`}>{nf(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AccountingViewPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  if (!(await hasPageAccess('business-accounting'))) return <PageAccessDenied />;

  const { ym: ymParam } = await searchParams;
  const ym = ymParam || todayKst().slice(0, 7);

  const itemsByFacility = await Promise.all(FACILITIES.map((f) => getAccountingItems(f)));
  const allItems = itemsByFacility.flat();
  const allValues = await getModuleValues(allItems.map((i) => i.id));
  const summaryRows = FACILITIES.map((f) => ({
    시설명: FACILITY_LABEL[f] ?? f, ...computeFacilityTotals(allItems, allValues, f, ym),
  }));

  const accountsByFacility = await Promise.all(FACILITIES.map((f) => getBankAccounts(f)));
  const allAccounts = accountsByFacility.flat();
  const allAccountValues = await getModuleValues(allAccounts.map((a) => a.id));

  const budgetItemsByFacility = await Promise.all(FACILITIES.map((f) => getBudgetItems(f)));
  const budgetRowsByFacility = await Promise.all(FACILITIES.map((f) => getBudgetRows(f, ym)));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
          <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
          <button type="submit" className={btnSecondary}>조회</button>
        </form>
        <Link href={`/business-summary/accounting?ym=${ym}`} className={btnOutline}>수정하기</Link>
      </div>

      <AccountingSummaryTable title={`5) ${ym} 수입지출현황`} rows={summaryRows} />

      {FACILITIES.map((f, i) => {
        const items = itemsByFacility[i];
        const income = items.filter((it) => it.구분 === '수입');
        const expense = items.filter((it) => it.구분 === '지출');
        return (
          <div key={f} className={`${card} mb-5`}>
            <h3 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">
              {i + 1}) {FACILITY_LABEL[f] ?? f} 수입지출 명세
            </h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Section title="수 입" rows={buildSectionRows(income, allValues, f, ym)} />
              <Section title="지 출" rows={buildSectionRows(expense, allValues, f, ym)} />
            </div>
          </div>
        );
      })}

      {FACILITIES.map((f, i) => {
        const accounts = accountsByFacility[i];
        if (accounts.length === 0) return null;
        const total = accounts.reduce((a, ac) => a + valueFor(allAccountValues, ac.id, f, ym), 0);
        return (
          <div key={f} className={`${card} mb-5`}>
            <h3 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">
              6-{i + 1}) {FACILITY_LABEL[f] ?? f} 예금잔액명세
            </h3>
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>은행명</th>
                    <th className={th}>계좌번호</th>
                    <th className={`${th} text-right`}>잔액(원)</th>
                    <th className={th}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                      <td className={`${td} whitespace-nowrap`}>{a.은행명}</td>
                      <td className={`${td} whitespace-nowrap`}>{a.계좌번호}</td>
                      <td className={`${td} text-right tabular-nums`}>{nf(valueFor(allAccountValues, a.id, f, ym))}</td>
                      <td className={td}>{a.비고}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                    <td className={td} colSpan={2}>소계</td>
                    <td className={`${td} text-right tabular-nums`}>{nf(total)}</td>
                    <td className={td} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {FACILITIES.map((f, i) => {
        const rows = budgetRowsByFacility[i];
        if (budgetItemsByFacility[i].length === 0) return null;
        return (
          <div key={f} className={`${card} mb-5`}>
            <h3 className="mb-3 text-[13px] font-bold text-brand-dark dark:text-brand">
              7-{i + 1}) {FACILITY_LABEL[f] ?? f} 예산집행현황
            </h3>
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>항목</th>
                    <th className={`${th} text-right`}>예산액(원)</th>
                    <th className={`${th} text-right`}>집행액(원)</th>
                    <th className={`${th} text-right`}>누계(원)</th>
                    <th className={th}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.항목ID} className="even:bg-[#f8f9fb] dark:even:bg-zinc-800/30">
                      <td className={`${td} whitespace-nowrap`}>{r.항목명}</td>
                      <td className={`${td} text-right tabular-nums`}>{nf(r.예산액)}</td>
                      <td className={`${td} text-right tabular-nums`}>{nf(r.집행액)}</td>
                      <td className={`${td} text-right tabular-nums`}>{nf(r.누계)}</td>
                      <td className={td}>{r.비고}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
