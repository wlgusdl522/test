import { getLaborCouncilMembers } from '@/lib/mutate/laborCouncil';
import { getActiveStaffList } from '@/lib/mutate/permissions';
import FormToggle from '@/components/FormToggle';
import {
  btn, btnDanger, cardTableWrap, h1, input, pageFluid, tableClean, tdClean, thClean, trHoverClean,
} from '@/lib/ui';
import { addLaborCouncilMemberAction, removeLaborCouncilMemberAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LaborCouncilMembersSettingsPage() {
  const [members, staff] = await Promise.all([getLaborCouncilMembers(), getActiveStaffList()]);
  const registeredEmails = new Set(members.map((m) => m.이메일));
  const selectable = staff.filter((s) => !registeredEmails.has(s.email));

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>설정 &gt; 노사협의회 위원</h1>
      <p className="mb-5 text-xs text-zinc-400">
        여기 등록된 위원(근로자위원·사용자위원)만 노사협의회 회의록을 작성·수정할 수 있습니다.
      </p>

      <FormToggle label="위원 등록">
        <form action={addLaborCouncilMemberAction} className="mb-6 flex flex-wrap gap-2">
          <select name="email" required className={input}>
            <option value="">직원 선택</option>
            {selectable.map((s) => <option key={s.email} value={s.email}>{s.name} ({s.team})</option>)}
          </select>
          <select name="구분" required defaultValue="근로자위원" className={input}>
            <option value="근로자위원">근로자위원</option>
            <option value="사용자위원">사용자위원</option>
          </select>
          <button type="submit" className={btn}>추가</button>
        </form>
      </FormToggle>

      <div className={cardTableWrap}>
        <table className={tableClean}>
          <thead>
            <tr>
              <th className={thClean}>구분</th>
              <th className={thClean}>성명</th>
              <th className={thClean}>이메일</th>
              <th className={thClean}></th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td className={tdClean} colSpan={4}>등록된 위원이 없습니다.</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.이메일} className={trHoverClean}>
                  <td className={tdClean}>{m.구분}</td>
                  <td className={tdClean}>{m.성명}</td>
                  <td className={tdClean}>{m.이메일}</td>
                  <td className={tdClean}>
                    <form action={removeLaborCouncilMemberAction}>
                      <input type="hidden" name="email" value={m.이메일} />
                      <button type="submit" className={btnDanger}>삭제</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
