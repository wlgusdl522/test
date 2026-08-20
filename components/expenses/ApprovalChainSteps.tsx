import { parseApprovalHistory } from '@/lib/approval/engine';

function formatTs(ts: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(ts || '');
  if (!m) return ts || '';
  return `${m[1]}.${m[2]}.${m[3]} ${m[4]}:${m[5]}`;
}

// 물품검수조서 결재선을 단계별로 보여준다 — 제출과 동시에 1단계 결재자에게는 이미 자동으로
// 잔디 알림이 나가 있으므로, 여기서 "요청"을 다시 누르게 하지 않고 진행 상황만 보여준다.
export default function ApprovalChainSteps({
  steps,
  report,
}: {
  steps: string[];
  report: Record<string, string>;
}) {
  if (steps.length === 0) {
    return <p className="text-xs text-zinc-400">결재 절차가 필요 없는 건입니다 (등록과 동시에 승인 처리).</p>;
  }

  const history = parseApprovalHistory(report.결재이력JSON);
  const approvedByStep = new Map(history.filter((h) => h.액션 === '승인').map((h) => [h.단계, h]));
  const rejected = history.find((h) => h.액션 === '반려');

  return (
    <ul className="flex flex-col gap-2.5">
      {steps.map((step, i) => {
        const approved = approvedByStep.get(step);
        const isCurrent = report.결재상태 === '결재중' && report.현재결재단계 === step;
        const isRejectedHere = rejected?.단계 === step;
        const circle = approved
          ? 'bg-emerald-500 text-white'
          : isRejectedHere
            ? 'bg-red-500 text-white'
            : isCurrent
              ? 'bg-brand text-white'
              : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400';
        return (
          <li key={step} className="flex items-start gap-2.5 text-xs">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-semibold shrink-0 ${circle}`}>
              {approved ? '✓' : isRejectedHere ? '×' : i + 1}
            </span>
            <div>
              <div className="font-medium text-zinc-800 dark:text-zinc-100">
                {step}
                {approved && ` · ${approved.승인자명}`}
                {isCurrent && report.현재결재자명 && ` · ${report.현재결재자명}`}
              </div>
              <div className="text-zinc-400 dark:text-zinc-500">
                {approved
                  ? `승인 · ${formatTs(approved.일시)}`
                  : isRejectedHere
                    ? `반려 · ${formatTs(rejected!.일시)}${rejected!.코멘트 ? ` · ${rejected!.코멘트}` : ''}`
                    : isCurrent
                      ? '알림 전송됨 · 결재 대기 중'
                      : '대기 중 (이전 단계 완료 시 자동 알림)'}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
