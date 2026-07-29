import { getWeeklyTasks } from '@/lib/mutate/weeklyTask';
import { getStaffList } from '@/lib/mutate/staff';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { SENIOR_POSITIONS } from '@/lib/auth-helpers';

// "내 업무 입력"에서 업무내용 끝에 "(연가)" 같은 휴가/교육 태그가 붙으면 부서별 취합의 "휴가" 행에 모은다.
// Index.html의 동명 LEAVE_TYPES와 반드시 동일하게 맞춰야 한다.
const LEAVE_TYPES = ['연가', '공가', '가족돌봄', '특별휴가', '건강검진', '교육(종일)', '0.75', '0.5(오전)', '0.5(오후)', '0.25(오전)', '0.25(오후)'];

function isLeaveTagContent(content: string): boolean {
  const m = /^(.+)\(([^)]+)\)$/.exec(content || '');
  return !!(m && LEAVE_TYPES.includes(m[2]));
}

export type WeeklyRollupLeader = {
  name: string;
  email: string;
  team: string;
  position: string;
  tasks: Record<string, string>[];
};

export type WeeklyRollupTeam = {
  team: string;
  tasks: Record<string, string>[];
};

export type WeeklyRollup = {
  leaders: WeeklyRollupLeader[];
  teams: WeeklyRollupTeam[];
  leaves: Record<string, string>[];
};

// 부서장 주간업무(관장/부장 개인 업무 + 팀별로 부서장이 반영하기로 고른 항목)를 한번에 모아 돌려준다.
// 관장/부장은 개인 리더라 게이트 없이 본인 업무 전체를, 팀은 부서장반영=TRUE로 고른 항목만 담는다.
export async function getSupervisorWeeklyRollup(weekStart: string): Promise<WeeklyRollup> {
  const [allTasks, staff, teams] = await Promise.all([
    getWeeklyTasks(null, weekStart),
    getStaffList(),
    getSimpleList(TEAM_LIST_SHEET_NAME),
  ]);

  const leaders = staff.filter((r) => SENIOR_POSITIONS.includes(r['직급/직책']) && r['재직상태'] === '재직');
  const leaderRows: WeeklyRollupLeader[] = leaders.map((r) => ({
    name: r['성명'],
    email: r['이메일(아이디)'],
    team: r['소속팀'],
    position: r['직급/직책'],
    tasks: allTasks.filter((t) => t['이메일(아이디)'] === r['이메일(아이디)']),
  }));

  const teamRows: WeeklyRollupTeam[] = teams
    .filter((t) => t !== '총괄')
    .map((team) => ({
      team,
      tasks: allTasks.filter((t) => t['소속팀'] === team && (t['부서장반영'] === 'TRUE' || t['부서장반영'] === 'true')),
    }));

  const leaveTasks = allTasks.filter((t) => isLeaveTagContent(t['업무내용']));

  return { leaders: leaderRows, teams: teamRows, leaves: leaveTasks };
}
