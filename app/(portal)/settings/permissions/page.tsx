import { CONFIGURABLE_PAGES, PAGE_ACCESS_TIERS } from '@/lib/pages-registry';
import { getActiveStaffList, getPageAccessExceptionMap, getPageAccessRuleMap } from '@/lib/mutate/permissions';
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
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>설정 &gt; 권한설정</h1>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>게시판(페이지)</th>
            <th>볼 수 있는 최소 직급</th>
            <th>개별 예외(직급 무관 항상 허용)</th>
          </tr>
        </thead>
        <tbody>
          {CONFIGURABLE_PAGES.map((page) => {
            const currentTier = rules[page.id] ?? '전체';
            const exceptedEmails = exceptions[page.id] ?? [];
            return (
              <tr key={page.id} style={{ verticalAlign: 'top' }}>
                <td style={{ padding: '8px 0' }}>{page.label}</td>
                <td>
                  <form action={setTierAction} style={{ display: 'flex', gap: 6 }}>
                    <input type="hidden" name="pageId" value={page.id} />
                    <input type="hidden" name="pageLabel" value={page.label} />
                    <select name="tier" defaultValue={currentTier} style={{ padding: 4 }}>
                      {PAGE_ACCESS_TIERS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <button type="submit">저장</button>
                  </form>
                </td>
                <td>
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: 13 }}>예외 대상자 ({exceptedEmails.length}명)</summary>
                    <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
                      {staff.map((s) => {
                        const isExcepted = exceptedEmails.includes(s.email.toLowerCase());
                        return (
                          <form
                            key={s.email}
                            action={isExcepted ? removeExceptionAction : addExceptionAction}
                            style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, padding: '2px 0' }}
                          >
                            <input type="hidden" name="pageId" value={page.id} />
                            <input type="hidden" name="email" value={s.email} />
                            <span style={{ flex: 1 }}>{s.name} ({s.team})</span>
                            <button type="submit">{isExcepted ? '제외' : '포함'}</button>
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
      </table>
    </main>
  );
}
