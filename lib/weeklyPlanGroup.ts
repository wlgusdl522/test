// 주간업무계획 "팀 조회"/인쇄 화면에서 영양사·조리사, 시설관리처럼 여러 담당자를 한 줄로 묶어
// 보여주기 위한 순수 로직. 클라이언트 컴포넌트(WeeklyPlanWorkspace)에서도 그대로 쓸 수 있어야
// 해서 시트/Supabase 접근 코드(lib/mutate)와 분리해 이 파일에 둔다.

export type RosterMember = { email: string; name: string };
export type WeeklyPlanGroupRow = { 그룹명: string; 이메일: string; 성명: string; 정렬순서: string };
export type GroupedRosterRow = { key: string; label: string; emails: string[] };

// roster 순서를 그대로 따라가면서, 그룹에 속한 멤버들은 그 그룹이 처음 등장하는 자리에 한 줄로
// 합쳐서 낸다. 그룹 멤버 중 로스터에 없는(퇴사 등) 사람은 조용히 빠진다.
export function buildGroupedRoster(roster: RosterMember[], groupRows: WeeklyPlanGroupRow[]): GroupedRosterRow[] {
  const rosterEmails = new Set(roster.map((m) => m.email.toLowerCase()));
  const groupNameByEmail = new Map<string, string>();
  for (const g of groupRows) {
    if (rosterEmails.has(g.이메일.toLowerCase())) groupNameByEmail.set(g.이메일.toLowerCase(), g.그룹명);
  }

  const rows: GroupedRosterRow[] = [];
  const emittedGroups = new Set<string>();
  for (const member of roster) {
    const groupName = groupNameByEmail.get(member.email.toLowerCase());
    if (!groupName) {
      rows.push({ key: member.email.toLowerCase(), label: member.name, emails: [member.email] });
      continue;
    }
    if (emittedGroups.has(groupName)) continue;
    emittedGroups.add(groupName);
    const members = groupRows
      .filter((g) => g.그룹명 === groupName && rosterEmails.has(g.이메일.toLowerCase()))
      .sort((a, b) => (Number(a.정렬순서) || 0) - (Number(b.정렬순서) || 0));
    rows.push({
      key: `group:${groupName}`,
      label: members.map((m) => m.성명).join(', '),
      emails: members.map((m) => m.이메일),
    });
  }
  return rows;
}
