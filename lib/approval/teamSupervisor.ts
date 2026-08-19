// 팀에서 실제 재직 중인 팀장/과장 1명을 찾는다 — 카드사용대장 결재란, 물품검수조서 '과장' 단계,
// 차량운행일지 '팀장' 단계가 모두 같은 규칙을 쓴다.
export function findTeamSupervisorEmail(team: string, staffList: Record<string, string>[]): string {
  if (!team) return '';
  const match = staffList.find(
    (s) => s['소속팀'] === team && s['재직상태'] === '재직' && (s['직급/직책'] === '팀장' || s['직급/직책'] === '과장')
  );
  return match?.['이메일(아이디)'] ?? '';
}

// 팀과 무관하게 직급/직책으로 재직 중인 1명을 찾는다 — 증명서 결재라인의 부장/관장 단계처럼
// 조직 전체에 한 명만 있는 직위를 찾을 때 쓴다.
export function findStaffEmailByPosition(position: string, staffList: Record<string, string>[]): string {
  const match = staffList.find((s) => s['재직상태'] === '재직' && s['직급/직책'] === position);
  return match?.['이메일(아이디)'] ?? '';
}

// 카드사용대장 물품검수조서의 1단계 결재자는 "카드를 쓴 사람 본인의 직급"에 따라 달라진다 —
// 사원(그 외 직급 전부 포함)이면 과장, 과장/팀장이면 부장, 부장이면 관장이 결재한다.
// 관장이 직접 쓴 건은 위에 결재할 사람이 없으므로 1단계 자체가 생략된다(빈 문자열 반환).
const CARD_LEDGER_APPROVAL_CHAIN: Record<string, string> = {
  과장: '부장',
  팀장: '부장',
  부장: '관장',
};

// requesterPosition: 카드사용대장 담당자(검수자)의 직급/직책 값.
// 반환값이 '과장'이면 findTeamSupervisorEmail로, '부장'/'관장'이면 findStaffEmailByPosition으로 결재자를 찾는다.
export function resolveCardLedgerFirstApprovalStep(requesterPosition: string): string {
  if (requesterPosition === '관장') return '';
  return CARD_LEDGER_APPROVAL_CHAIN[requesterPosition] ?? '과장';
}
