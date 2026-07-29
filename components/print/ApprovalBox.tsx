import type { ApprovalBoxData } from '@/lib/approval/approvalLine';

export default function ApprovalBox({ data }: { data: ApprovalBoxData | null }) {
  if (!data || !data.visibleLine.length) return null;
  const { visibleLine, delegatedLastCell } = data;

  return (
    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', flexShrink: 0 }}>
      <tbody>
        <tr>
          <td
            rowSpan={2}
            style={{ border: '1.5px solid #333', background: '#eef1f5', width: 34, textAlign: 'center', fontSize: 14, padding: 2 }}
          >
            결<br />재
          </td>
          {visibleLine.map((label, i) => (
            <td
              key={i}
              style={{ border: '1.5px solid #333', background: '#eef1f5', width: 100, textAlign: 'center', fontSize: 16, fontWeight: 600, padding: '8px 2px' }}
            >
              {label}
            </td>
          ))}
        </tr>
        <tr>
          {visibleLine.map((_, i) => (
            <td key={i} style={{ border: '1.5px solid #333', height: 70, textAlign: 'center', verticalAlign: 'top', paddingTop: 8 }}>
              {delegatedLastCell && i === visibleLine.length - 1 && (
                <span style={{ display: 'inline-block', border: '1.5px solid #000', color: '#000', fontSize: 14, padding: '2px 10px', borderRadius: 3 }}>
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
