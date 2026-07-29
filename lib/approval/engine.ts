export type ApprovalHistoryEntry = {
  단계: string;
  액션: '승인' | '반려';
  승인자이메일: string;
  승인자명: string;
  코멘트: string;
  일시: string;
};

export function parseApprovalHistory(json: string | undefined): ApprovalHistoryEntry[] {
  try {
    return JSON.parse(json || '[]');
  } catch {
    return [];
  }
}

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function currentStep(steps: string[], history: ApprovalHistoryEntry[]): string {
  const done = new Set(history.filter((h) => h.액션 === '승인').map((h) => h.단계));
  return steps.find((s) => !done.has(s)) ?? '';
}

export type DecoratedApproval = {
  현재결재단계: string;
  현재결재자이메일: string;
  현재결재자명: string;
  결재이력: ApprovalHistoryEntry[];
};

// record['결재상태']가 '결재중'일 때만 현재 단계/결재자를 채운다(승인/반려 완료 건은 빈 값).
export function decorateApprovalInfo(
  record: Record<string, string>,
  steps: string[],
  resolveApproverEmail: (step: string) => string,
  staffNameByEmail: (email: string) => string
): DecoratedApproval {
  const history = parseApprovalHistory(record['결재이력JSON']);
  const step = record['결재상태'] === '결재중' ? currentStep(steps, history) : '';
  const approverEmail = step ? resolveApproverEmail(step) : '';
  const approverName = approverEmail ? staffNameByEmail(approverEmail) || approverEmail : '';
  return {
    현재결재단계: step,
    현재결재자이메일: approverEmail,
    현재결재자명: approverName,
    결재이력: history,
  };
}

export class ApprovalPermissionError extends Error {}

// action 적용 후 새 결재이력/다음 상태를 계산한다. 정당한 결재자가 아니면(관리자 제외) 에러를 던진다.
export function applyApprovalAction(params: {
  record: Record<string, string>;
  steps: string[];
  action: '승인' | '반려';
  actorEmail: string;
  actorName: string;
  comment: string;
  isAdmin: boolean;
  currentApproverEmail: string;
}): { history: ApprovalHistoryEntry[]; historyJson: string; nextStatus: string } {
  const { record, steps, action, actorEmail, actorName, comment, isAdmin, currentApproverEmail } = params;
  if (record['결재상태'] !== '결재중') {
    throw new ApprovalPermissionError('이미 처리된 건입니다.');
  }
  if (!isAdmin && (!currentApproverEmail || currentApproverEmail.toLowerCase() !== actorEmail.toLowerCase())) {
    throw new ApprovalPermissionError('이 건을 결재할 권한이 없습니다.');
  }

  const history = parseApprovalHistory(record['결재이력JSON']);
  const step = currentStep(steps, history);
  const delegated = isAdmin && !!currentApproverEmail && currentApproverEmail.toLowerCase() !== actorEmail.toLowerCase();

  history.push({
    단계: step,
    액션: action,
    승인자이메일: actorEmail,
    승인자명: actorName + (delegated ? ' (관리자 대리처리)' : ''),
    코멘트: comment || '',
    일시: nowTimestamp(),
  });

  const doneSteps = new Set(history.filter((h) => h.액션 === '승인').map((h) => h.단계));
  const nextStatus = action === '반려' ? '반려' : steps.every((s) => doneSteps.has(s)) ? '승인' : '결재중';

  return { history, historyJson: JSON.stringify(history), nextStatus };
}

// 반려된 건을 작성자가 수정 후 재제출하면, 이전 이력은 버리고 결재중 상태로 처음부터 다시 시작한다
// (원본 Code.js와 동일한 정책 — 반려 즉시가 아니라 재제출 시점에 초기화).
export function resetApprovalOnResubmit(): { 결재상태: string; 결재이력JSON: string } {
  return { 결재상태: '결재중', 결재이력JSON: '[]' };
}
