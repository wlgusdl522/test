import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { getTransitCardList, getTransitLedgerList, sumFlowsThrough } from '@/lib/mutate/transitCard';
import { buildApprovalBoxData } from '@/lib/approval/approvalLine';
import { parseAmount } from '@/lib/format';
import ApprovalBox from '@/components/print/ApprovalBox';
import PrintButton from '@/components/print/PrintButton';
import { btn, card, inputBase, tableClean, tableWrap, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function prevMonthEnd(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1, 0); // 이번 달 1일에서 하루 전 = 전월 마지막날
  return d.toISOString().slice(0, 10);
}

export default async function TransitCardPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; ym?: string }>;
}) {
  const { cardId, ym } = await searchParams;
  const yearMonth = ym ?? new Date().toISOString().slice(0, 7);
  const [cards, records, approvalRules, approvalLine, me, staffList] = await Promise.all([
    getTransitCardList(),
    getTransitLedgerList(),
    getKeyedList(APPROVAL_JEONGYEOL_TABLE),
    getSimpleList(APPROVAL_LINE_SHEET_NAME),
    getViewerStaffRecord(),
    getStaffList(),
  ]);
  const targetCardId = cardId ?? cards[0]?.카드ID ?? '';
  const targetCard = cards.find((c) => c.카드ID === targetCardId);

  const initBalance = parseAmount(targetCard?.초기잔액 ?? '0');
  const before = sumFlowsThrough(targetCardId, records, prevMonthEnd(yearMonth));
  const carryOver = initBalance + before.charge - before.use;

  const monthRecords = records
    .filter((r) => r['교통카드'] === targetCardId && r['사용일자'].startsWith(yearMonth))
    .sort((a, b) => a['사용일자'].localeCompare(b['사용일자']) || a.id.localeCompare(b.id));

  let running = carryOver;
  const rows = monthRecords.map((r) => {
    running += parseAmount(r['충전액']) - parseAmount(r['사용액']);
    return {
      id: r.id,
      사용일자: r['사용일자'],
      담당자명: r['담당자명'],
      목적: r['목적'],
      출발지: r['출발지'],
      도착지: r['도착지'],
      교통수단: r['교통수단'],
      충전액: r['충전액'],
      사용액: r['사용액'],
      잔액: running,
    };
  });
  const monthCharge = monthRecords.reduce((sum, r) => sum + parseAmount(r['충전액']), 0);
  const monthUse = monthRecords.reduce((sum, r) => sum + parseAmount(r['사용액']), 0);
  const endBalance = carryOver + monthCharge - monthUse;
  const [year, month] = yearMonth.split('-');

  const rule = approvalRules.find((r) => r.페이지ID === 'transit-card');
  const approvalData = buildApprovalBoxData(
    approvalLine,
    rule?.전결기준 ?? '',
    rule?.담당표시 ?? '자동',
    rule?.결재라인여부 ?? '사용',
    me?.['직급/직책'] ?? '',
    me?.소속팀 ?? '',
    staffList
  );

  return (
    <div className="p-6 print:p-3">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="cardId" defaultValue={targetCardId} className={`${inputBase} w-auto`}>
            {cards.map((c) => <option key={c.카드ID} value={c.카드ID}>{c.카드명 || c.카드ID} ({c.카드ID})</option>)}
          </select>
          <input type="month" name="ym" defaultValue={yearMonth} className={`${inputBase} w-auto`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className="bg-white dark:bg-zinc-900">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>{targetCard?.카드명 || targetCardId} 교통카드 사용대장</h2>
            <div style={{ marginTop: 4, fontSize: 13, color: '#666' }}>
              {year}년 {Number(month)}월 · 전월이월액 {carryOver.toLocaleString()}원
              {' · '}당월충전 {monthCharge.toLocaleString()}원 · 당월사용 {monthUse.toLocaleString()}원
              {' · '}월말잔액 {endBalance.toLocaleString()}원
            </div>
          </div>
          <ApprovalBox data={approvalData} scale={0.55} />
        </div>
        <div className={tableWrap}>
          <table className={tableClean} style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className={th}>사용일자</th><th className={th}>담당자</th><th className={th}>목적</th>
                <th className={th}>출발지</th><th className={th}>도착지</th><th className={th}>교통수단</th>
                <th className={th}>충전액</th><th className={th}>사용액</th><th className={th}>잔액</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td className={td} colSpan={9} style={{ textAlign: 'center', color: '#888' }}>해당 월 사용 기록이 없습니다.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r['사용일자']}</td>
                  <td className={td}>{r['담당자명']}</td>
                  <td className={td}>{r['목적']}</td>
                  <td className={td}>{r['출발지']}</td>
                  <td className={td}>{r['도착지']}</td>
                  <td className={td}>{r['교통수단']}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r['충전액'] ? parseAmount(r['충전액']).toLocaleString() : ''}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r['사용액'] ? parseAmount(r['사용액']).toLocaleString() : ''}</td>
                  <td className={td} style={{ textAlign: 'right' }}>{r.잔액.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
