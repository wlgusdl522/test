import { getStaffList } from '@/lib/mutate/staff';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { getWeeklyPlanGroups } from '@/lib/mutate/weeklyPlanGroup';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { btn, btnDanger, btnSecondary, h2, input, inputBase } from '@/lib/ui';
import PageAccessDenied from '@/components/PageAccessDenied';
import { addWeeklyPlanGroupMemberAction, removeWeeklyPlanGroupMemberAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function GroupSection({
  team,
  groupName,
  members,
  addableStaff,
}: {
  team: string;
  groupName: string;
  members: { id: string; 이메일: string; 성명: string }[];
  addableStaff: Record<string, string>[];
}) {
  return (
    <section className="rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
      <h2 className={h2}>{groupName}</h2>
      <ul className="flex flex-col gap-1 mb-3">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-1.5 text-sm">
            <span className="flex-1 text-zinc-800 dark:text-zinc-200">{m.성명}</span>
            <form action={removeWeeklyPlanGroupMemberAction}>
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" className={btnDanger}>삭제</button>
            </form>
          </li>
        ))}
        {members.length === 0 && <li className="text-sm text-zinc-400">등록된 담당자가 없습니다.</li>}
      </ul>
      <form action={addWeeklyPlanGroupMemberAction} className="flex gap-2">
        <input type="hidden" name="team" value={team} />
        <input type="hidden" name="groupName" value={groupName} />
        <select name="staff" required className={input}>
          <option value="">직원 선택</option>
          {addableStaff.map((s) => (
            <option key={s['이메일(아이디)']} value={`${s['이메일(아이디)']}::${s['성명']}`}>
              {s['성명']} ({s['직급/직책']})
            </option>
          ))}
        </select>
        <button type="submit" className={btn}>추가</button>
      </form>
    </section>
  );
}

export default async function WeeklyPlanGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const params = await searchParams;
  const [me, teams] = await Promise.all([getViewerStaffRecord(), getSimpleList(TEAM_LIST_SHEET_NAME)]);
  const team = params.team ?? me?.소속팀 ?? teams[0] ?? '';

  if (!(await hasPageAccess('weekly-plan-groups'))) {
    return <PageAccessDenied />;
  }

  const [staffList, groups] = await Promise.all([getStaffList(), getWeeklyPlanGroups(team)]);
  const teamStaff = staffList.filter((s) => s['소속팀'] === team && s['재직상태'] !== '퇴사');
  const groupNames = Array.from(new Set(groups.map((g) => g.그룹명)));

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        여기서 묶은 담당자들은 &ldquo;팀 조회&rdquo;와 인쇄용 주간업무계획표에서 한 줄로 합쳐서 표시됩니다
        (예: 영양사·조리사, 시설관리). 각자 업무 입력은 그대로 개인별로 합니다.
      </p>

      <form method="get" className="flex items-center gap-2 mb-5">
        <select name="team" defaultValue={team} className={`${inputBase} w-auto`}>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-6">
        {groupNames.map((name) => (
          <GroupSection
            key={name}
            team={team}
            groupName={name}
            members={groups.filter((g) => g.그룹명 === name)}
            addableStaff={teamStaff.filter(
              (s) => !groups.some((g) => g.그룹명 === name && g.이메일.toLowerCase() === s['이메일(아이디)'].toLowerCase())
            )}
          />
        ))}
        {groupNames.length === 0 && (
          <p className="text-sm text-zinc-400">아직 등록된 그룹이 없습니다. 아래에서 새 그룹을 만들어보세요.</p>
        )}
      </div>

      <section className="rounded-lg border border-dashed border-zinc-300 p-3.5 dark:border-zinc-700">
        <h2 className={h2}>새 그룹 만들기</h2>
        <form action={addWeeklyPlanGroupMemberAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="team" value={team} />
          <input name="groupName" placeholder="그룹명 (예: 영양사·조리사)" required className={`${input} sm:w-56`} />
          <select name="staff" required className={`${input} sm:w-48`}>
            <option value="">직원 선택</option>
            {teamStaff.map((s) => (
              <option key={s['이메일(아이디)']} value={`${s['이메일(아이디)']}::${s['성명']}`}>
                {s['성명']} ({s['직급/직책']})
              </option>
            ))}
          </select>
          <button type="submit" className={btn}>만들기</button>
        </form>
      </section>
    </div>
  );
}
