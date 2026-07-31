import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { buildApprovalBoxData } from '@/lib/approval/approvalLine';
import ApprovalBox from '@/components/print/ApprovalBox';
import PrintButton from '@/components/print/PrintButton';
import { btn, card, input, inputBase, table, tableWrap, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['체크카드', '신용카드', '계좌이체'];

export default async function CardLedgerPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; type?: string | string[] }>;
}) {
  const { ym, type } = await searchParams;
  const yearMonth = ym ?? new Date().toISOString().slice(0, 7);
  const selectedTypes = type ? (Array.isArray(type) ? type : [type]) : TYPES;

  const [records, approvalRules, approvalLine, me, staffList] = await Promise.all([
    getCardLedgerList(),
    getKeyedList(APPROVAL_JEONGYEOL_TABLE),
    getSimpleList(APPROVAL_LINE_SHEET_NAME),
    getViewerStaffRecord(),
    getStaffList(),
  ]);

  const rule = approvalRules.find((r) => r.페이지ID === 'card-ledger');
  const filtered = records.filter((r) => r.사용일자.slice(0, 7) === yearMonth);
  const [year, month] = yearMonth.split('-');
  const sections = TYPES.filter((t) => selectedTypes.includes(t)).map((t) => ({
    type: t,
    rows: filtered.filter((r) => r.구분 === t),
  })).filter((s) => s.rows.length > 0);

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-4">
          <input type="month" name="ym" defaultValue={yearMonth} className={`${inputBase} w-auto`} />
          {TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" name="type" value={t} defaultChecked={selectedTypes.includes(t)} /> {t}
            </label>
          ))}
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      {sections.length === 0 && (
        <div className={card}>
          <p className="text-sm text-zinc-500">연/월과 구분을 선택하고 조회를 눌러주세요.</p>
        </div>
      )}

      {sections.map(({ type: t, rows }) => {
        const total = rows.reduce((sum, r) => sum + Number(r.사용금액 || 0), 0);
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
          <div key={t} className="bg-white dark:bg-zinc-900 mb-10 print:break-after-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>서대문노인종합복지관</h2>
                <div style={{ marginTop: 6, fontSize: 19, color: '#666' }}>
                  {year}년 {Number(month)}월 {t} 사용대장
                </div>
              </div>
              <ApprovalBox data={approvalData} />
            </div>
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>사용일자</th><th className={th}>담당자명</th><th className={th}>사용금액</th>
                    <th className={th}>예산과목</th><th className={th}>사용내역</th><th className={th}>카드번호</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className={td}>{r.사용일자}</td>
                      <td className={td}>{r.담당자명}</td>
                      <td className={td} style={{ textAlign: 'right' }}>{Number(r.사용금액 || 0).toLocaleString()}원</td>
                      <td className={td}>{r.예산과목}</td>
                      <td className={td}>{r.사용내역}</td>
                      <td className={td}>{r.카드번호}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={td} colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>합계</td>
                    <td className={td} style={{ textAlign: 'right', fontWeight: 700 }}>{total.toLocaleString()}원</td>
                    <td className={td} colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
