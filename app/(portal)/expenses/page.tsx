import { getKeyedList } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE } from '@/lib/sheets/registry';
import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { addCardLedgerAction, deleteCardLedgerAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const [records, budgetItems] = await Promise.all([
    getCardLedgerList(),
    getKeyedList(BUDGET_ITEM_TABLE),
  ]);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>카드사용대장</h1>

      <form action={addCardLedgerAction} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '16px 0', border: '1px solid #ddd', padding: 16 }}>
        <label>
          구분 *
          <select name="type" defaultValue="체크카드" style={{ width: '100%', padding: 6 }}>
            <option value="체크카드">체크카드</option>
            <option value="신용카드">신용카드</option>
            <option value="계좌이체">계좌이체</option>
          </select>
        </label>
        <label>
          사용일자 *
          <input type="date" name="date" required style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          담당자명
          <input name="name" placeholder="본인 이름(비우면 자동)" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          사용금액 *
          <input type="number" name="amount" required style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          예산과목 *
          <select name="budgetItem" required style={{ width: '100%', padding: 6 }}>
            {budgetItems.map((b) => <option key={b.예산과목명} value={b.예산과목명}>{b.예산과목명}</option>)}
          </select>
        </label>
        <label>
          카드번호(뒤 4자리)
          <input name="cardNo" maxLength={4} style={{ width: '100%', padding: 6 }} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          사용내역 *
          <input name="description" required style={{ width: '100%', padding: 6 }} />
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit">등록</button>
        </div>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>사용일자</th><th>구분</th><th>담당자</th><th>사용금액</th><th>예산과목</th><th>사용내역</th><th>카드번호</th><th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.사용일자}</td>
              <td>{r.구분}</td>
              <td>{r.담당자명}</td>
              <td>{Number(r.사용금액 || 0).toLocaleString()}원</td>
              <td>{r.예산과목}</td>
              <td>{r.사용내역}</td>
              <td>{r.카드번호}</td>
              <td>
                <form action={deleteCardLedgerAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit">삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
