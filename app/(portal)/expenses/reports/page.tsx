import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckReportList, getMyPendingItemCheckReportApprovals } from '@/lib/mutate/itemCheckReport';
import { btn, btnDanger, btnSecondary, card, h1, h2, input, label, pageWide, table, tableWrap, td, th } from '@/lib/ui';
import StatusBadge from '@/components/StatusBadge';
import {
  actOnItemCheckReportAction,
  addItemCheckReportAction,
  deleteItemCheckReportAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ItemCheckReportsPage() {
  const [reports, pending, ledgerRecords] = await Promise.all([
    getItemCheckReportList(),
    getMyPendingItemCheckReportApprovals(),
    getCardLedgerList(),
  ]);

  return (
    <main className={pageWide}>
      <h1 className={h1}>물품검수조서</h1>

      {pending.length > 0 && (
        <>
          <h2 className={h2}>내 결재 대기 ({pending.length}건)</h2>
          <div className={tableWrap}><table className={table}>
            <thead>
              <tr><th className={th}>품명</th><th className={th}>금액</th><th className={th}>검수자</th><th className={th}>단계</th><th className={th}></th></tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.품명}</td>
                  <td className={td}>{Number(r.금액 || 0).toLocaleString()}원</td>
                  <td className={td}>{r.검수자명}</td>
                  <td className={td}>{r.현재결재단계}</td>
                  <td className={`${td} flex gap-1.5`}>
                    <form action={actOnItemCheckReportAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnItemCheckReportAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}

      <h2 className={h2}>새 조서 등록</h2>
      <form action={addItemCheckReportAction} className={`${card} grid grid-cols-2 gap-3`}>
        <label className={label}>
          카드사용대장 연결 *
          <select name="ledgerId" required className={input}>
            {ledgerRecords.map((r) => (
              <option key={r.id} value={r.id}>{r.사용일자} · {r.사용내역} · {Number(r.사용금액 || 0).toLocaleString()}원</option>
            ))}
          </select>
        </label>
        <label className={label}>
          품명 *
          <input name="itemName" required className={input} />
        </label>
        <label className={label}>
          등록구분 *
          <select name="registerType" defaultValue="비대상" className={input}>
            <option value="비대상">비대상</option>
            <option value="등록대상">등록대상</option>
          </select>
        </label>
        <label className={label}>
          비품등록번호
          <input name="assetNo" className={input} />
        </label>
        <label className={label}>
          납품처상호
          <input name="vendorName" className={input} />
        </label>
        <label className={label}>
          납품처대표자
          <input name="vendorOwner" className={input} />
        </label>
        <label className={label}>
          계약금액
          <input type="number" name="contractAmount" className={input} />
        </label>
        <label className={label}>
          계약체결년월일
          <input type="date" name="contractDate" className={input} />
        </label>
        <label className={label}>
          납품기한
          <input type="date" name="deliveryDue" className={input} />
        </label>
        <label className={label}>
          납품완료일자
          <input type="date" name="deliveryDate" className={input} />
        </label>
        <label className={label}>
          검수년월일
          <input type="date" name="checkDate" className={input} />
        </label>
        <label className={label}>
          검수장소
          <input name="checkPlace" className={input} />
        </label>
        <label className={label}>
          규격
          <input name="spec" className={input} />
        </label>
        <label className={label}>
          단위
          <input name="unit" className={input} />
        </label>
        <label className={label}>
          수량
          <input type="number" name="qty" className={input} />
        </label>
        <label className={label}>
          단가
          <input type="number" name="unitPrice" className={input} />
        </label>
        <label className={label}>
          금액
          <input type="number" name="amount" className={input} />
        </label>
        <label className={label}>
          품목명
          <input name="lineItemName" className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          비고
          <input name="note" className={input} />
        </label>
        <div>
          <button type="submit" className={btn}>제출</button>
        </div>
      </form>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>품명</th><th className={th}>등록구분</th><th className={th}>금액</th>
            <th className={th}>검수자</th><th className={th}>결재상태</th><th className={th}>현재단계</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td className={td}>{r.품명}</td>
              <td className={td}>{r.등록구분}</td>
              <td className={td}>{Number(r.금액 || 0).toLocaleString()}원</td>
              <td className={td}>{r.검수자명}</td>
              <td className={td}><StatusBadge status={r.결재상태} /></td>
              <td className={td}>{r.현재결재단계}</td>
              <td className={`${td} flex gap-1.5`}>
                <a href={`/print/item-check-report?id=${r.id}`} target="_blank" className={btnSecondary}>인쇄</a>
                <form action={deleteItemCheckReportAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={btnSecondary}>삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </main>
  );
}
