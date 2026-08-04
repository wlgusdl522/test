// 조직도/캘린더 등에서 팀을 항상 이 순서로 노출한다. 목록에 없는 팀명(신규 팀 등)은 뒤로 보낸다.
export const TEAM_ORDER = ['미배정', '복지1팀', '복지2팀', '복지3팀', '총무팀', '요양센터', '데이케어센터'];

export function teamRank(team: string): number {
  const idx = TEAM_ORDER.indexOf(team);
  return idx === -1 ? TEAM_ORDER.length : idx;
}
