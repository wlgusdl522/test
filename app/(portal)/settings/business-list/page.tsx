import { getBusinessList } from '@/lib/mutate/business';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { btn, btnDanger, h1, input, page, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addBusinessAction, deleteBusinessAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessListSettingsPage() {
  const [businesses, teams] = await Promise.all([getBusinessList(), getSimpleList(TEAM_LIST_SHEET_NAME)]);

  return (
    <main className={page}>
      <h1 className={h1}>설정 &gt; 사업목록</h1>

      <FormToggle label="사업 등록">
        <form action={addBusinessAction} className="flex gap-2 mb-6">
          <input name="name" placeholder="새 사업명" required className={input} />
          <select name="team" required className={input}>
            <option value="">소관팀 선택</option>
            {teams.map((team) => <option key={team} value={team}>{team}</option>)}
          </select>
          <button type="submit" className={btn}>추가</button>
        </form>
      </FormToggle>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr><th className={th}>사업명</th><th className={th}>소관팀</th><th className={th}></th></tr>
        </thead>
        <tbody>
          {businesses.map((b) => (
            <tr key={b.name} className={trZebraHover}>
              <td className={td}>{b.name}</td>
              <td className={td}>{b.team}</td>
              <td className={td}>
                <form action={deleteBusinessAction}>
                  <input type="hidden" name="name" value={b.name} />
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
