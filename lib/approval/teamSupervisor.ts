// 팀에서 실제 재직 중인 팀장/과장 1명을 찾는다 — 카드사용대장 결재란, 물품검수조서 '과장' 단계,
// 차량운행일지 '팀장' 단계가 모두 같은 규칙을 쓴다.
export function findTeamSupervisorEmail(team: string, staffList: Record<string, string>[]): string {
  if (!team) return '';
  const match = staffList.find(
    (s) => s['소속팀'] === team && s['재직상태'] === '재직' && (s['직급/직책'] === '팀장' || s['직급/직책'] === '과장')
  );
  return match?.['이메일(아이디)'] ?? '';
}
