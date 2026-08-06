import type { ApprovalBoxData } from '@/lib/approval/approvalLine';

// scale: 결재란 전체 크기를 비율로 줄이고 싶을 때(예: 칼럼이 적어 상대적으로 커 보이는 화면) 사용.
// 기본값 1이라 기존에 쓰던 화면들은 그대로.
export default function ApprovalBox({ data, scale = 1 }: { data: ApprovalBoxData | null; scale?: number }) {
  if (!data || !data.visibleLine.length) return null;
  const { visibleLine, delegatedLastCell } = data;

  const labelWidth = 34 * scale;
  const cellWidth = 100 * scale;
  const cellHeight = 70 * scale;
  const labelFontSize = 14 * scale;
  const headerFontSize = 16 * scale;
  const headerPadding = `${8 * scale}px ${2 * scale}px`;

  return (
    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', flexShrink: 0 }}>
      <tbody>
        <tr>
          <td
            rowSpan={2}
            style={{ border: '1.5px solid #333', background: '#eef1f5', width: labelWidth, textAlign: 'center', fontSize: labelFontSize, padding: 2 }}
          >
            결<br />재
          </td>
          {visibleLine.map((label, i) => (
            <td
              key={i}
              style={{ border: '1.5px solid #333', background: '#eef1f5', width: cellWidth, textAlign: 'center', fontSize: headerFontSize, fontWeight: 600, padding: headerPadding }}
            >
              {label}
            </td>
          ))}
        </tr>
        <tr>
          {visibleLine.map((_, i) => (
            <td key={i} style={{ border: '1.5px solid #333', height: cellHeight, textAlign: 'center', verticalAlign: 'top', paddingTop: 8 * scale }}>
              {delegatedLastCell && i === visibleLine.length - 1 && (
                <span style={{ display: 'inline-block', border: '1.5px solid #000', color: '#000', fontSize: labelFontSize, padding: `${2 * scale}px ${10 * scale}px`, borderRadius: 3 }}>
                  전결
                </span>
              )}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
