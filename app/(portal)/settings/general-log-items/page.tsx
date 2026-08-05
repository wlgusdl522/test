import { getBusinessList } from '@/lib/mutate/business';
import { getGeneralLogItems } from '@/lib/mutate/generalLogItem';
import { requireCanManagePermissions } from '@/lib/auth-helpers';
import {
  btn, btnSecondary, cardTableWrap, h1, hint, inputBase, label, pageFluid, tableClean, tdClean, thClean, trHoverClean,
} from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { addGeneralLogItemAction, deleteGeneralLogItemAction, updateGeneralLogItemAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function GeneralLogItemsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; edit?: string }>;
}) {
  await requireCanManagePermissions();
  const { business: businessParam, edit } = await searchParams;

  const businesses = await getBusinessList();
  const business = businessParam || businesses[0]?.name || '';
  const items = business ? await getGeneralLogItems(business) : [];
  const editing = edit ? items.find((i) => i.id === edit) : null;

  return (
    <main className={pageFluid}>
      <h1 className={h1}>설정 &gt; 총괄업무일지 구분항목</h1>
      <p className={hint}>
        총괄업무일지 상단 통계표에 나오는 대분류/중분류/세부항목과 목표(건/명)를 사업별로 관리합니다.
        여기서 등록한 세부항목이 총괄업무일지 화면의 일계 입력 행이 됩니다.
      </p>

      <form method="get" className="flex items-center gap-2 mb-4">
        <select name="business" defaultValue={business} className={`${inputBase} w-auto`}>
          {businesses.map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      {!business ? (
        <p className="text-sm text-zinc-500">먼저 사업목록을 등록해주세요. (설정 &gt; 사업목록)</p>
      ) : (
        <>
          <FormToggle key={editing?.id ?? ''} label={editing ? '항목 수정' : '항목 등록'} defaultOpen={!!editing}>
            <form action={editing ? updateGeneralLogItemAction : addGeneralLogItemAction} className="grid grid-cols-2 gap-3">
              <input type="hidden" name="business" value={business} />
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <label className={label}>
                대분류
                <input name="major" defaultValue={editing?.대분류 ?? ''} className={inputBase} />
              </label>
              <label className={label}>
                중분류
                <input name="middle" defaultValue={editing?.중분류 ?? ''} className={inputBase} />
              </label>
              <label className={label}>
                세부항목 *
                <input name="detail" defaultValue={editing?.세부항목 ?? ''} required className={inputBase} />
              </label>
              <label className={label}>
                정렬순서
                <input type="number" name="order" defaultValue={editing?.정렬순서 ?? items.length} className={inputBase} />
              </label>
              <label className={label}>
                목표(건)
                <input name="targetCount" defaultValue={editing?.목표건 ?? ''} className={inputBase} />
              </label>
              <label className={label}>
                목표(명)
                <input name="targetPeople" defaultValue={editing?.목표명 ?? ''} className={inputBase} />
              </label>
              <div className="col-span-2">
                <button type="submit" className={btn}>{editing ? '저장' : '추가'}</button>
              </div>
            </form>
          </FormToggle>

          <div className={cardTableWrap}><table className={tableClean}>
            <thead>
              <tr>
                <th className={thClean}>대분류</th>
                <th className={thClean}>중분류</th>
                <th className={thClean}>세부항목</th>
                <th className={thClean}>순서</th>
                <th className={thClean}>목표(건)</th>
                <th className={thClean}>목표(명)</th>
                <th className={thClean}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td className={tdClean} colSpan={7}><span className="text-zinc-400">등록된 항목이 없습니다.</span></td></tr>
              ) : items.map((i) => (
                <tr key={i.id} className={trHoverClean}>
                  <td className={tdClean}>{i.대분류}</td>
                  <td className={tdClean}>{i.중분류}</td>
                  <td className={tdClean}>{i.세부항목}</td>
                  <td className={tdClean}>{i.정렬순서}</td>
                  <td className={tdClean}>{i.목표건}</td>
                  <td className={tdClean}>{i.목표명}</td>
                  <td className={`${tdClean} flex gap-1.5`}>
                    <a href={`/settings/general-log-items?business=${encodeURIComponent(business)}&edit=${i.id}`} className={btnSecondary}>수정</a>
                    <form action={deleteGeneralLogItemAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="business" value={business} />
                      <ConfirmSubmitButton
                        confirmMessage="이 항목을 삭제할까요? 이미 저장된 일계 데이터는 남아있지만 화면에는 더 이상 보이지 않습니다."
                        className={btnSecondary}
                      >
                        삭제
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </main>
  );
}
