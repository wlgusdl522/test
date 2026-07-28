import { getKeyedList } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE } from '@/lib/sheets/registry';
import { addBudgetItemAction, deleteBudgetItemAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BudgetItemsSettingsPage() {
  const items = await getKeyedList(BUDGET_ITEM_TABLE);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h1>설정 &gt; 예산과목</h1>
      <p style={{ color: '#666', fontSize: 13 }}>
        카드사용대장 등록폼의 예산과목 드롭다운에 그대로 반영됩니다. &quot;사업비&quot;는 연계사업명을,
        &quot;공통비&quot;는 소관팀(예: 총무팀)을 함께 적어주세요.
      </p>

      <form action={addBudgetItemAction} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        <input name="name" placeholder="새 예산과목명" required style={{ padding: 6 }} />
        <select name="type" defaultValue="사업비" style={{ padding: 6 }}>
          <option value="사업비">사업비</option>
          <option value="공통비">공통비</option>
        </select>
        <input name="linked" placeholder="연계사업명(사업비) / 소관팀(공통비)" style={{ padding: 6 }} />
        <button type="submit">추가</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>예산과목명</th>
            <th>구분</th>
            <th>연계사업명</th>
            <th>소관팀</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.예산과목명}>
              <td>{b.예산과목명}</td>
              <td>{b.구분}</td>
              <td>{b.연계사업명}</td>
              <td>{b.소관팀}</td>
              <td>
                <form action={deleteBudgetItemAction}>
                  <input type="hidden" name="name" value={b.예산과목명} />
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
