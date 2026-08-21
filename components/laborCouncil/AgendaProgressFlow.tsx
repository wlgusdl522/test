import { Fragment } from 'react';
import type { AgendaStatus } from '@/lib/mutate/laborCouncil';

export const AGENDA_STAGES: AgendaStatus[] = ['접수', '검토중', '상정예정', '협의완료', '결과공유'];

// 진행상황 흐름의 "현재 단계" 색은 기존 상태 배지 색(회색/파랑/호박색/초록)을 그대로 재사용한다 —
// 새 색을 만들지 않고 이미 쓰던 의미를 그대로 가져와서, 화면 전체의 색 일관성을 유지한다.
export const AGENDA_STAGE_COLOR: Record<AgendaStatus, { dot: string; ring: string; text: string }> = {
  접수: { dot: '#52525b', ring: '#f4f4f5', text: '#52525b' },
  검토중: { dot: '#2563eb', ring: '#eff6ff', text: '#1d4ed8' },
  상정예정: { dot: '#d97706', ring: '#fffbeb', text: '#b45309' },
  협의완료: { dot: '#059669', ring: '#ecfdf5', text: '#047857' },
  결과공유: { dot: '#3f3f46', ring: '#f4f4f5', text: '#3f3f46' },
};

const PAST_DOT = '#a1a1aa';
const PAST_LINE = '#a1a1aa';
const FUTURE_LINE = '#e4e4e7';
const FUTURE_BORDER = '#d4d4d8';

export default function AgendaProgressFlow({
  status,
  round,
  compact = false,
}: {
  status: AgendaStatus;
  round?: string;
  compact?: boolean;
}) {
  const idx = AGENDA_STAGES.indexOf(status);
  const color = AGENDA_STAGE_COLOR[status];
  const pastSize = compact ? 6 : 8;
  const currentSize = compact ? 9 : 12;
  const futureSize = compact ? 6 : 8;
  const ringWidth = compact ? 2 : 3;
  const lineHeight = compact ? 2 : 2;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {AGENDA_STAGES.map((s, i) => (
          <Fragment key={s}>
            {i > 0 && (
              <div style={{ flex: 1, height: lineHeight, background: i <= idx ? PAST_LINE : FUTURE_LINE }} />
            )}
            {i < idx && (
              <div style={{ width: pastSize, height: pastSize, borderRadius: 9999, background: PAST_DOT, flexShrink: 0 }} />
            )}
            {i === idx && (
              <div
                style={{
                  width: currentSize,
                  height: currentSize,
                  borderRadius: 9999,
                  background: color.dot,
                  boxShadow: `0 0 0 ${ringWidth}px ${color.ring}`,
                  flexShrink: 0,
                  display: s === '결과공유' ? 'flex' : undefined,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s === '결과공유' && (
                  <svg width={currentSize * 0.55} height={currentSize * 0.55} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            )}
            {i > idx && (
              <div style={{ width: futureSize, height: futureSize, borderRadius: 9999, border: `1.5px solid ${FUTURE_BORDER}`, background: '#fff', flexShrink: 0 }} />
            )}
          </Fragment>
        ))}
      </div>

      {compact ? (
        <div style={{ fontSize: 10, fontWeight: 700, color: color.text, marginTop: 4 }}>
          {status}{round ? ` · 제${round}차` : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a1a1aa', marginTop: 6 }}>
          {AGENDA_STAGES.map((s) => (
            <span key={s} style={s === status ? { color: color.text, fontWeight: 700 } : undefined}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}
