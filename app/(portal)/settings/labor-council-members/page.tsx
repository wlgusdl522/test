import { getLaborCouncilMembers, type LaborCouncilMember, type LaborCouncilMemberType } from '@/lib/mutate/laborCouncil';
import { getActiveStaffList, type ActiveStaff } from '@/lib/mutate/permissions';
import FormToggle from '@/components/FormToggle';
import StaffTeamChecklist from '@/components/laborCouncil/StaffTeamChecklist';
import { btn, btnDanger, cardTableWrap, h1, pageFluid, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { addLaborCouncilMembersAction, removeLaborCouncilMemberAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function MemberTable({
  title,
  구분,
  members,
  selectable,
}: {
  title: string;
  구분: LaborCouncilMemberType;
  members: LaborCouncilMember[];
  selectable: ActiveStaff[];
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title} ({members.length}명)</h2>
        <FormToggle label={`${title} 추가`} buttonLabel={`+ ${title} 추가`} wrapperClassName="">
          <form action={addLaborCouncilMembersAction} className="flex flex-col gap-3">
            <input type="hidden" name="구분" value={구분} />
            <StaffTeamChecklist staff={selectable} name="emails" />
            <button type="submit" className={btn}>선택한 직원 추가</button>
          </form>
        </FormToggle>
      </div>

      <div className={cardTableWrap}>
        <table className={tableClean}>
          <thead>
            <tr>
              <th className={thClean}>성명</th>
              <th className={thClean}>이메일</th>
              <th className={thClean}></th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td className={tdClean} colSpan={3}>등록된 {title}이 없습니다.</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.이메일} className={trHoverClean}>
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
    </div>
  );
}

export default async function LaborCouncilMembersSettingsPage() {
  const [members, staff] = await Promise.all([getLaborCouncilMembers(), getActiveStaffList()]);
  const registeredEmails = new Set(members.map((m) => m.이메일));
  const selectable = staff.filter((s) => !registeredEmails.has(s.email));

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>설정 &gt; 노사협의회 위원</h1>
      <p className="mb-5 text-xs text-zinc-400">
        여기 등록된 위원(근로자위원·사용자위원)만 노사협의회 회의록을 작성·수정할 수 있습니다. 실명 공개된
        안건의 실제 제안자는 근로자위원만 확인할 수 있습니다.
      </p>

      <MemberTable
        title="근로자위원"
        구분="근로자위원"
        members={members.filter((m) => m.구분 === '근로자위원')}
        selectable={selectable}
      />
      <MemberTable
        title="사용자위원"
        구분="사용자위원"
        members={members.filter((m) => m.구분 === '사용자위원')}
        selectable={selectable}
      />
    </main>
  );
}
