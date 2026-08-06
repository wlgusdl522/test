import { getKeyedList } from '@/lib/mutate/keyedTable';
import { APPROVAL_JEONGYEOL_TABLE } from '@/lib/sheets/registry';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { APPROVAL_LINE_USAGE_MODES, DAMDANG_DISPLAY_MODES, PRINTABLE_PAGES } from '@/lib/pages-registry';
import { btn, cardTableWrap, h1, input, inputBase, pageFluid, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
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
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>설정 &gt; 결재라인 &gt; 게시판별 전결기준</h1>

      <div className={cardTableWrap}><table className={tableClean}>
        <thead>
          <tr>
            <th className={thClean}>게시판</th>
            <th className={thClean} colSpan={4}>전결 설정</th>
          </tr>
        </thead>
        <tbody>
          {PRINTABLE_PAGES.map((p) => {
            const current = byPageId[p.id];
            return (
              <tr key={p.id} className={trHoverClean}>
                <td className={tdClean}>{p.label}</td>
                <td className={tdClean} colSpan={4}>
                  <form action={setApprovalRuleAction} className="flex items-center gap-2">
                    <input type="hidden" name="pageId" value={p.id} />
                    <input type="hidden" name="pageLabel" value={p.label} />
                    <select name="jeongyeol" defaultValue={current?.전결기준 ?? ''} className={`${inputBase} w-auto`}>
                      <option value="">(전결 없음)</option>
                      {approvalLine.map((position) => <option key={position} value={position}>{position}</option>)}
                    </select>
                    <select name="damdangMode" defaultValue={current?.담당표시 ?? '자동'} className={`${inputBase} w-auto`}>
                      {DAMDANG_DISPLAY_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select name="approvalLineUsage" defaultValue={current?.결재라인여부 ?? '사용'} className={`${inputBase} w-auto`}>
                      {APPROVAL_LINE_USAGE_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button type="submit" className={btn}>저장</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </main>
  );
}
