import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { APPROVAL_LINE_USAGE_MODES, DAMDANG_DISPLAY_MODES, PRINTABLE_PAGES } from '@/lib/pages-registry';
import { setApprovalRuleAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ApprovalRulesSettingsPage() {
  const [rows, approvalLine] = await Promise.all([
    getKeyedList(APPROVAL_JEONGYEOL_TABLE),
    getSimpleList(APPROVAL_LINE_SHEET_NAME),
  ]);
  const byPageId: Record<string, Record<string, string>> = {};
  rows.forEach((r) => {
    byPageId[r.페이지ID] = r;
  });

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>설정 &gt; 결재라인 &gt; 게시판별 전결기준</h1>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>게시판</th>
            <th>전결기준</th>
            <th>담당표시</th>
            <th>결재라인여부</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {PRINTABLE_PAGES.map((page) => {
            const current = byPageId[page.id];
            return (
              <tr key={page.id}>
                <td style={{ padding: '8px 0' }}>{page.label}</td>
                <td colSpan={4}>
                  <form action={setApprovalRuleAction} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="hidden" name="pageId" value={page.id} />
                    <input type="hidden" name="pageLabel" value={page.label} />
                    <select name="jeongyeol" defaultValue={current?.전결기준 ?? ''} style={{ padding: 4 }}>
                      <option value="">(전결 없음)</option>
                      {approvalLine.map((position) => (
                        <option key={position} value={position}>{position}</option>
                      ))}
                    </select>
                    <select name="damdangMode" defaultValue={current?.담당표시 ?? '자동'} style={{ padding: 4 }}>
                      {DAMDANG_DISPLAY_MODES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select name="approvalLineUsage" defaultValue={current?.결재라인여부 ?? '사용'} style={{ padding: 4 }}>
                      {APPROVAL_LINE_USAGE_MODES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <button type="submit">저장</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
