import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { buildApprovalBoxData } from '@/lib/approval/approvalLine';
import ApprovalBox from '@/components/print/ApprovalBox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['체크카드', '신용카드', '계좌이체'];

export default async function CardLedgerPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const yearMonth = ym ?? new Date().toISOString().slice(0, 7);

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

  return (
    <div>
      <form method="get" className="mb-6 print:hidden">
        <input type="month" name="ym" defaultValue={yearMonth} />
        <button type="submit">조회</button>
      </form>

      {TYPES.map((type) => {
        const rows = filtered.filter((r) => r.구분 === type);
        if (!rows.length) return null;
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
          <div key={type} style={{ marginBottom: 40, pageBreakAfter: 'always' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>서대문노인종합복지관</h2>
                <div style={{ marginTop: 6, fontSize: 19, color: '#666' }}>
                  {year}년 {Number(month)}월 {type} 사용대장
                </div>
              </div>
              <ApprovalBox data={approvalData} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>사용일자</th><th>담당자명</th><th>사용금액</th><th>예산과목</th><th>사용내역</th><th>카드번호</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.사용일자}</td>
                    <td>{r.담당자명}</td>
                    <td style={{ textAlign: 'right' }}>{Number(r.사용금액 || 0).toLocaleString()}원</td>
                    <td>{r.예산과목}</td>
                    <td>{r.사용내역}</td>
                    <td>{r.카드번호}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>합계</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{total.toLocaleString()}원</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}
