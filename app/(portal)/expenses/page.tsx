import { getKeyedList } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE } from '@/lib/sheets/registry';
import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { btn, btnDanger, btnSecondary, card, h1, input, label, pageWide, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addCardLedgerAction, deleteCardLedgerAction, updateCardLedgerAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [records, budgetItems] = await Promise.all([
    getCardLedgerList(),
    getKeyedList(BUDGET_ITEM_TABLE),
  ]);
  const editing = edit ? records.find((r) => r.id === edit) : null;

  return (
    <main className={pageWide}>
      <div className="flex items-center justify-between">
        <h1 className={h1}>카드사용대장</h1>
        <a href="/print/card-ledger" target="_blank" className="text-sm text-brand hover:underline">월별 인쇄</a>
      </div>

      <FormToggle label={editing ? '내역 수정' : '신규 등록'} defaultOpen={!!editing}>
        <form action={editing ? updateCardLedgerAction : addCardLedgerAction} className={`${card} grid grid-cols-2 gap-3`}>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <label className={label}>
            구분 *
            <select name="type" defaultValue={editing?.구분 ?? '체크카드'} className={input}>
              <option value="체크카드">체크카드</option>
              <option value="신용카드">신용카드</option>
              <option value="계좌이체">계좌이체</option>
            </select>
          </label>
          <label className={label}>
            사용일자 *
            <input type="date" name="date" defaultValue={editing?.사용일자 ?? ''} required className={input} />
          </label>
          <label className={label}>
            담당자명
            <input name="name" defaultValue={editing?.담당자명 ?? ''} placeholder="본인 이름(비우면 자동)" className={input} />
          </label>
          <label className={label}>
            사용금액 *
            <input type="number" name="amount" defaultValue={editing?.사용금액 ?? ''} required className={input} />
          </label>
          <label className={label}>
            예산과목 *
            <select name="budgetItem" defaultValue={editing?.예산과목 ?? ''} required className={input}>
              {budgetItems.map((b) => <option key={b.예산과목명} value={b.예산과목명}>{b.예산과목명}</option>)}
            </select>
          </label>
          <label className={label}>
            카드번호(뒤 4자리)
            <input name="cardNo" defaultValue={editing?.카드번호 ?? ''} maxLength={4} className={input} />
          </label>
          <label className={`${label} col-span-2`}>
            사용내역 *
            <input name="description" defaultValue={editing?.사용내역 ?? ''} required className={input} />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
            {editing && <a href="/expenses" className="text-xs text-zinc-500 hover:underline">취소</a>}
          </div>
        </form>
      </FormToggle>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>사용일자</th><th className={th}>구분</th><th className={th}>담당자</th>
            <th className={th}>사용금액</th><th className={th}>예산과목</th><th className={th}>사용내역</th>
            <th className={th}>카드번호</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className={trZebraHover}>
              <td className={td}>{r.사용일자}</td>
              <td className={td}>{r.구분}</td>
              <td className={td}>{r.담당자명}</td>
              <td className={td}>{Number(r.사용금액 || 0).toLocaleString()}원</td>
              <td className={td}>{r.예산과목}</td>
              <td className={td}>{r.사용내역}</td>
              <td className={td}>{r.카드번호}</td>
              <td className={`${td} flex gap-1.5`}>
                <a href={`/expenses?edit=${r.id}`} className={btnSecondary}>수정</a>
                <form action={deleteCardLedgerAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={btnDanger}>삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </main>
  );
}
