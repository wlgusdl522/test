import { findTeamSupervisorEmail } from './teamSupervisor';

// 결재라인의 "과장" 자리를, 실제 그 팀에 재직 중인 사람의 진짜 직급(팀장 또는 과장)으로 바꿔서 보여준다.
export function resolveApprovalLineLabels(line: string[], viewerTeam: string, staffList: Record<string, string>[]): string[] {
  if (!viewerTeam) return line;
  const teamLeadEmail = findTeamSupervisorEmail(viewerTeam, staffList);
  if (!teamLeadEmail) return line;
  const teamLead = staffList.find((s) => s['이메일(아이디)'] === teamLeadEmail);
  if (!teamLead) return line;
  return line.map((pos) => (pos === '과장' ? teamLead['직급/직책'] : pos));
}

export type ApprovalBoxData = {
  visibleLine: string[];
  delegatedLastCell: boolean; // 전결 표시 — 마지막 칸에 "전결" 도장
};

// approvalLine: 전체 결재라인(예: ['담당','과장','부장','관장']), jeongyeol: 전결 기준 직책(비어있으면 전결 없음)
export function buildApprovalBoxData(
  approvalLine: string[],
  jeongyeol: string,
  damdangMode: string,
  approvalLineUsage: string,
  viewerPosition: string,
  viewerTeam: string,
  staffList: Record<string, string>[]
): ApprovalBoxData | null {
  if (approvalLineUsage === '미사용') return null;

  const jeongyeolIdx = jeongyeol ? approvalLine.indexOf(jeongyeol) : -1;
  const hasHigherRanksCut = jeongyeolIdx > -1 && jeongyeolIdx < approvalLine.length - 1;
  const cutLine = jeongyeolIdx > -1 ? approvalLine.slice(0, jeongyeolIdx + 1) : approvalLine;
  if (!cutLine.length) return null;

  let displayLine = resolveApprovalLineLabels(cutLine, viewerTeam, staffList);

  if (damdangMode === '표시') {
    // 그대로 둔다.
  } else if (damdangMode === '숨김') {
    if (displayLine.length > 1) displayLine = displayLine.slice(1);
  } else {
    const startIdx = viewerPosition ? displayLine.indexOf(viewerPosition) : -1;
    if (startIdx > 0) displayLine = displayLine.slice(startIdx);
  }

  return { visibleLine: displayLine, delegatedLastCell: hasHigherRanksCut };
}
