import { getBusinessList } from '@/lib/mutate/business';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { btn, btnDanger, cardTableWrap, h1, input, pageFluid, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addBusinessAction, deleteBusinessAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessListSettingsPage() {
  const [businesses, teams] = await Promise.all([getBusinessList(), getSimpleList(TEAM_LIST_SHEET_NAME)]);

  return (
    <main className={pageFluid}>
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

      <div className={cardTableWrap}><table className={tableClean}>
        <thead>
          <tr><th className={thClean}>사업명</th><th className={thClean}>소관팀</th><th className={thClean}></th></tr>
        </thead>
        <tbody>
          {businesses.map((b) => (
            <tr key={b.name} className={trHoverClean}>
              <td className={tdClean}>{b.name}</td>
              <td className={tdClean}>{b.team}</td>
              <td className={tdClean}>
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
