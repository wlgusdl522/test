import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckReportList, getMyPendingItemCheckReportApprovals } from '@/lib/mutate/itemCheckReport';
import { isAccountingViewer } from '@/lib/auth-helpers';
import { btn, btnDanger, btnSecondary, card, h1, h2, input, label, pageWide, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import StatusBadge from '@/components/StatusBadge';
import FormToggle from '@/components/FormToggle';
import {
  actOnItemCheckReportAction,
  addItemCheckReportAction,
  deleteItemCheckReportAction,
  setItemCheckReportPrintedAction,
  updateItemCheckReportAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ItemCheckReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [reports, pending, ledgerRecords, canCheckAccounting] = await Promise.all([
    getItemCheckReportList(),
    getMyPendingItemCheckReportApprovals(),
    getCardLedgerList(),
    isAccountingViewer(),
  ]);
  const editing = edit ? reports.find((r) => r.id === edit) : null;

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
                <tr key={r.id} className={trZebraHover}>
                  <td className={td}>{r.품명}</td>
                  <td className={td}>{Number(r.금액 || 0).toLocaleString()}원</td>
                  <td className={td}>{r.검수자명}</td>
                  <td className={td}>{r.현재결재단계}</td>
                  <td className={`${td} flex items-center gap-1.5`}>
                    <form action={actOnItemCheckReportAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnItemCheckReportAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <input name="comment" placeholder="반려 사유" className={`${input} w-28 text-xs`} />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}

      <h2 className={h2}>{editing ? '조서 수정' : '새 조서 등록'}</h2>
      <FormToggle label={editing ? '조서 수정' : '조서 등록'} defaultOpen={!!editing}>
      <form action={editing ? updateItemCheckReportAction : addItemCheckReportAction} className={`${card} grid grid-cols-2 gap-3`}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <label className={label}>
          카드사용대장 연결 *
          <select name="ledgerId" defaultValue={editing?.카드사용대장ID ?? ''} required className={input}>
            {ledgerRecords.map((r) => (
              <option key={r.id} value={r.id}>{r.사용일자} · {r.사용내역} · {Number(r.사용금액 || 0).toLocaleString()}원</option>
            ))}
          </select>
        </label>
        <label className={label}>
          품명 *
          <input name="itemName" defaultValue={editing?.품명 ?? ''} required className={input} />
        </label>
        <label className={label}>
          등록구분 *
          <select name="registerType" defaultValue={editing?.등록구분 ?? '비대상'} className={input}>
            <option value="비대상">비대상</option>
            <option value="등록대상">등록대상</option>
          </select>
        </label>
        <label className={label}>
          비품등록번호
          <input name="assetNo" defaultValue={editing?.비품등록번호 ?? ''} className={input} />
        </label>
        <label className={label}>
          납품처상호
          <input name="vendorName" defaultValue={editing?.납품처상호 ?? ''} className={input} />
        </label>
        <label className={label}>
          납품처대표자
          <input name="vendorOwner" defaultValue={editing?.납품처대표자 ?? ''} className={input} />
        </label>
        <label className={label}>
          계약금액
          <input type="number" name="contractAmount" defaultValue={editing?.계약금액 ?? ''} className={input} />
        </label>
        <label className={label}>
          계약체결년월일
          <input type="date" name="contractDate" defaultValue={editing?.계약체결년월일 ?? ''} className={input} />
        </label>
        <label className={label}>
          납품기한
          <input type="date" name="deliveryDue" defaultValue={editing?.납품기한 ?? ''} className={input} />
        </label>
        <label className={label}>
          납품완료일자
          <input type="date" name="deliveryDate" defaultValue={editing?.납품완료일자 ?? ''} className={input} />
        </label>
        <label className={label}>
          검수년월일
          <input type="date" name="checkDate" defaultValue={editing?.검수년월일 ?? ''} className={input} />
        </label>
        <label className={label}>
          검수장소
          <input name="checkPlace" defaultValue={editing?.검수장소 ?? ''} className={input} />
        </label>
        <label className={label}>
          규격
          <input name="spec" defaultValue={editing?.규격 ?? ''} className={input} />
        </label>
        <label className={label}>
          단위
          <input name="unit" defaultValue={editing?.단위 ?? ''} className={input} />
        </label>
        <label className={label}>
          수량
          <input type="number" name="qty" defaultValue={editing?.수량 ?? ''} className={input} />
        </label>
        <label className={label}>
          단가
          <input type="number" name="unitPrice" defaultValue={editing?.단가 ?? ''} className={input} />
        </label>
        <label className={label}>
          금액
          <input type="number" name="amount" defaultValue={editing?.금액 ?? ''} className={input} />
        </label>
        <label className={label}>
          품목명
          <input name="lineItemName" defaultValue={editing?.품목명 ?? ''} className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          비고
          <input name="note" defaultValue={editing?.비고 ?? ''} className={input} />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className={btn}>{editing ? '저장' : '제출'}</button>
          {editing && <a href="/expenses/reports" className="text-xs text-zinc-500 hover:underline">취소</a>}
        </div>
      </form>
      </FormToggle>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>품명</th><th className={th}>등록구분</th><th className={th}>금액</th>
            <th className={th}>검수자</th><th className={th}>결재상태</th><th className={th}>현재단계</th>
            <th className={th}>회계확인</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => {
            const checked = !!r.인쇄일시;
            return (
              <tr key={r.id} className={trZebraHover}>
                <td className={td}>{r.품명}</td>
                <td className={td}>{r.등록구분}</td>
                <td className={td}>{Number(r.금액 || 0).toLocaleString()}원</td>
                <td className={td}>{r.검수자명}</td>
                <td className={td}><StatusBadge status={r.결재상태} /></td>
                <td className={td}>{r.현재결재단계}</td>
                <td className={td}>
                  {canCheckAccounting ? (
                    <form action={setItemCheckReportPrintedAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="printed" value={String(!checked)} />
                      <button type="submit" title="회계확인 표시 토글">{checked ? '✅' : '☐'}</button>
                    </form>
                  ) : (
                    <span>{checked ? '✅' : '☐'}</span>
                  )}
                </td>
                <td className={`${td} flex gap-1.5`}>
                  <a href={`/expenses/reports?edit=${r.id}`} className={btnSecondary}>수정</a>
                  <a href={`/print/item-check-report?id=${r.id}`} target="_blank" className={btnSecondary}>인쇄</a>
                  <form action={deleteItemCheckReportAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className={btnSecondary}>삭제</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </main>
  );
}
