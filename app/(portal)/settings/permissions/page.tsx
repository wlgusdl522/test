import { getAdminList } from '@/lib/auth-helpers';
import { CONFIGURABLE_PAGES, PAGE_ACCESS_TIERS } from '@/lib/pages-registry';
import { getActiveStaffList, getPageAccessExceptionMap, getPageAccessRuleMap } from '@/lib/mutate/permissions';
import { btn, btnDanger, btnSecondary, card, cardTableWrap, h1, h2, hint, input, inputBase, pageFluid, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { addAdminAction, addExceptionAction, removeAdminAction, removeExceptionAction, setTierAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Staff = Awaited<ReturnType<typeof getActiveStaffList>>[number];
type PageDef = (typeof CONFIGURABLE_PAGES)[number];

function TierForm({ p, currentTier }: { p: PageDef; currentTier: string }) {
  return (
    <form action={setTierAction} className="flex flex-wrap gap-1.5">
      <input type="hidden" name="pageId" value={p.id} />
      <input type="hidden" name="pageLabel" value={p.label} />
      <select key={currentTier} name="tier" defaultValue={currentTier} className={`${inputBase} w-auto`}>
        {PAGE_ACCESS_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <button type="submit" className={btn}>저장</button>
    </form>
  );
}

function ExceptionsDetails({ p, staff, exceptedEmails }: { p: PageDef; staff: Staff[]; exceptedEmails: string[] }) {
  return (
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
  );
}

export default async function PermissionsSettingsPage() {
  const [rules, exceptions, staff, admins] = await Promise.all([
    getPageAccessRuleMap(),
    getPageAccessExceptionMap(),
    getActiveStaffList(),
    getAdminList(),
  ]);
  const adminEmails = admins.map((a) => a.email);
  const candidates = staff.filter((s) => !adminEmails.includes(s.email.toLowerCase()));

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>설정 &gt; 권한설정</h1>

      <div className={card}>
        <h2 className={h2}>관리자</h2>
        <p className={hint}>관리자는 아래 권한 등급·전결 설정과 무관하게 모든 화면·사업을 볼 수 있습니다.</p>
        <ul className="mb-3 flex flex-col gap-1.5">
          {admins.map((a) => (
            <li key={a.email} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{a.name || a.email} <span className="text-xs text-zinc-400">{a.email}</span></span>
              <form action={removeAdminAction}>
                <input type="hidden" name="email" value={a.email} />
                <ConfirmSubmitButton
                  confirmMessage={`${a.name || a.email}님을 관리자에서 제거할까요?`}
                  className={btnDanger}
                  title={admins.length <= 1 ? '마지막 남은 관리자는 제거할 수 없습니다' : undefined}
                >
                  제거
                </ConfirmSubmitButton>
              </form>
            </li>
          ))}
        </ul>
        {candidates.length > 0 && (
          <form action={addAdminAction} className="flex flex-wrap gap-2">
            <select name="email" required className={`${inputBase} w-auto`}>
              <option value="">직원 선택</option>
              {candidates.map((s) => (
                <option key={s.email} value={s.email}>{s.name} ({s.team})</option>
              ))}
            </select>
            <button type="submit" className={btn}>관리자로 추가</button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:hidden">
        {CONFIGURABLE_PAGES.map((p) => {
          const currentTier = rules[p.id] ?? '전체';
          const exceptedEmails = exceptions[p.id] ?? [];
          return (
            <div key={p.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.label}</p>
              <div className="mt-2">
                <TierForm p={p} currentTier={currentTier} />
              </div>
              <div className="mt-2">
                <ExceptionsDetails p={p} staff={staff} exceptedEmails={exceptedEmails} />
              </div>
            </div>
          );
        })}
      </div>

      <div className={`hidden sm:block ${cardTableWrap}`}><table className={tableClean}>
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
                  <TierForm p={p} currentTier={currentTier} />
                </td>
                <td className={tdClean}>
                  <ExceptionsDetails p={p} staff={staff} exceptedEmails={exceptedEmails} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </main>
  );
}
