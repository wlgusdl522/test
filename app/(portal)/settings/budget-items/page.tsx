import { getKeyedList } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE } from '@/lib/sheets/registry';
import { btn, btnDanger, h1, hint, input, page, table, tableWrap, td, th } from '@/lib/ui';
import { addBudgetItemAction, deleteBudgetItemAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BudgetItemsSettingsPage() {
  const items = await getKeyedList(BUDGET_ITEM_TABLE);

  return (
    <main className={page}>
      <h1 className={h1}>설정 &gt; 예산과목</h1>
      <p className={hint}>
        카드사용대장 등록폼의 예산과목 드롭다운에 그대로 반영됩니다. &quot;사업비&quot;는 연계사업명을,
        &quot;공통비&quot;는 소관팀(예: 총무팀)을 함께 적어주세요.
      </p>

      <form action={addBudgetItemAction} className="flex flex-wrap gap-2 mb-6">
        <input name="name" placeholder="새 예산과목명" required className={`${input} w-auto`} />
        <select name="type" defaultValue="사업비" className={`${input} w-auto`}>
          <option value="사업비">사업비</option>
          <option value="공통비">공통비</option>
        </select>
        <input name="linked" placeholder="연계사업명(사업비) / 소관팀(공통비)" className={`${input} w-auto`} />
        <button type="submit" className={btn}>추가</button>
      </form>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>예산과목명</th>
            <th className={th}>구분</th>
            <th className={th}>연계사업명</th>
            <th className={th}>소관팀</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.예산과목명}>
              <td className={td}>{b.예산과목명}</td>
              <td className={td}>{b.구분}</td>
              <td className={td}>{b.연계사업명}</td>
              <td className={td}>{b.소관팀}</td>
              <td className={td}>
                <form action={deleteBudgetItemAction}>
                  <input type="hidden" name="name" value={b.예산과목명} />
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
