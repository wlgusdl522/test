import { getBusinessList } from '@/lib/mutate/business';
import { DEFAULT_APPROVAL_LINE, getAllBusinessSettings } from '@/lib/mutate/businessPlan';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { btn, btnDanger, cardTableWrap, h1, input, inputBase, label, pageFluid, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addBusinessAction, deleteBusinessAction, saveBusinessSettingsAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessListSettingsPage() {
  const [businesses, teams, settingsMap] = await Promise.all([
    getBusinessList(),
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getAllBusinessSettings(),
  ]);

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>설정 &gt; 사업목록</h1>

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
          {businesses.map((b) => {
            const s = settingsMap[b.name] ?? { 총목표: 0, 활동내용라벨: '활동내용', 결재라인: DEFAULT_APPROVAL_LINE };
            return (
              <tr key={b.name} className={trHoverClean}>
                <td className={tdClean}>{b.name}</td>
                <td className={tdClean}>{b.team}</td>
                <td className={tdClean}>
                  <div className="flex gap-2">
                    <FormToggle label={`${b.name} · 총괄업무일지 설정`}>
                      <form action={saveBusinessSettingsAction} className="flex flex-col gap-3">
                        <input type="hidden" name="business" value={b.name} />
                        <label className={label}>
                          총목표(명)
                          <input name="grandGoal" type="number" min="0" defaultValue={s.총목표} className={inputBase} />
                        </label>
                        <label className={label}>
                          활동내용 라벨
                          <input name="actLabel" defaultValue={s.활동내용라벨} className={inputBase} />
                        </label>
                        <label className={label}>
                          결재라인 (쉼표로 구분)
                          <input name="approvalLine" defaultValue={s.결재라인.join(', ')} className={inputBase} />
                        </label>
                        <button type="submit" className={`${btn} w-fit`}>저장</button>
                      </form>
                    </FormToggle>
                    <form action={deleteBusinessAction}>
                      <input type="hidden" name="name" value={b.name} />
                      <button type="submit" className={btnDanger}>삭제</button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </main>
  );
}
