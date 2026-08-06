import { CONFIGURABLE_PAGES, PAGE_ACCESS_TIERS } from '@/lib/pages-registry';
import { getActiveStaffList, getPageAccessExceptionMap, getPageAccessRuleMap } from '@/lib/mutate/permissions';
import { btn, btnSecondary, cardTableWrap, h1, input, inputBase, pageFluid, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { addExceptionAction, removeExceptionAction, setTierAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PermissionsSettingsPage() {
  const [rules, exceptions, staff] = await Promise.all([
    getPageAccessRuleMap(),
    getPageAccessExceptionMap(),
    getActiveStaffList(),
  ]);

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>설정 &gt; 권한설정</h1>

      <div className={cardTableWrap}><table className={tableClean}>
        <thead>
          <tr>
            <th className={thClean}>게시판(페이지)</th>
            <th className={thClean}>볼 수 있는 최소 직급</th>
            <th className={thClean}>개별 예외(직급 무관 항상 허용)</th>
          </tr>
        </thead>
        <tbody>
          {CONFIGURABLE_PAGES.map((p) => {
            const currentTier = rules[p.id] ?? '전체';
            const exceptedEmails = exceptions[p.id] ?? [];
            return (
              <tr key={p.id} className={`align-top ${trHoverClean}`}>
                <td className={tdClean}>{p.label}</td>
                <td className={tdClean}>
                  <form action={setTierAction} className="flex gap-1.5">
                    <input type="hidden" name="pageId" value={p.id} />
                    <input type="hidden" name="pageLabel" value={p.label} />
                    <select key={currentTier} name="tier" defaultValue={currentTier} className={`${inputBase} w-auto`}>
                      {PAGE_ACCESS_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button type="submit" className={btn}>저장</button>
                  </form>
                </td>
                <td className={tdClean}>
                  <details>
                    <summary className="cursor-pointer text-xs text-zinc-500">예외 대상자 ({exceptedEmails.length}명)</summary>
                    <div className="mt-1.5 max-h-48 overflow-y-auto">
                      {staff.map((s) => {
                        const isExcepted = exceptedEmails.includes(s.email.toLowerCase());
                        return (
                          <form
                            key={s.email}
                            action={isExcepted ? removeExceptionAction : addExceptionAction}
                            className="flex items-center gap-1.5 py-0.5 text-xs"
                          >
                            <input type="hidden" name="pageId" value={p.id} />
                            <input type="hidden" name="email" value={s.email} />
                            <span className="flex-1">{s.name} ({s.team})</span>
                            <button type="submit" className={btnSecondary}>{isExcepted ? '제외' : '포함'}</button>
                          </form>
                        );
                      })}
                    </div>
                  </details>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </main>
  );
}
