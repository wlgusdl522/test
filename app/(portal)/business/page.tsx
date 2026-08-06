import { getBusinessList } from '@/lib/mutate/business';
import { getBusinessPlanTree, getBusinessSettings, planGoal } from '@/lib/mutate/businessPlan';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { btn, btnDanger, btnSecondary, card, hint, input, inputBase, label, selectFilter } from '@/lib/ui';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import PageAccessDenied from '@/components/PageAccessDenied';
import {
  addBasisAction,
  addPlanAction,
  addSubAction,
  deleteBasisAction,
  deletePlanAction,
  deleteSubAction,
  saveBusinessSettingsAction,
  updateBasisAction,
  updatePlanAction,
  updateSubAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');
const inputSm = `${inputBase} w-full`;

export default async function BusinessGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  if (!(await hasPageAccess('business-goal'))) return <PageAccessDenied />;

  const { business: businessParam } = await searchParams;
  const businesses = await getBusinessList();
  const business = businessParam || businesses[0]?.name || '';

  if (!business) {
    return <p className="text-sm text-zinc-500">설정 &gt; 사업목록에서 사업을 먼저 등록해주세요.</p>;
  }

  const [settings, tree] = await Promise.all([getBusinessSettings(business), getBusinessPlanTree(business)]);

  let totalGp = 0;
  let totalGc = 0;
  let totalBudget = 0;
  const rows = tree.map((sub) => {
    const plans = sub.plans.map((plan) => {
      const goal = planGoal(sub, plan);
      totalGp += goal.gp;
      totalGc += goal.gc;
      totalBudget += plan.예산;
      return { plan, goal };
    });
    return { sub, plans };
  });
  const matches = totalGp === settings.총목표;

  return (
    <div>
      <p className={hint}>
        &ldquo;산출근거&rdquo; 한 줄(직접입력 또는 인원×횟수)이 곧 일계입력·월별현황의 목표 항목 하나가 됩니다.
        계획서를 고치면 일지의 목표도 그대로 같이 바뀝니다.
      </p>

      <div className={card}>
        <form action={saveBusinessSettingsAction} className="flex flex-wrap items-end gap-4 p-4">
          <input type="hidden" name="business" value={business} />
          <label className={label}>
            총목표(명)
            <input name="grandGoal" type="number" min="0" defaultValue={settings.총목표} className={`${inputBase} w-32`} />
          </label>
          <label className={label}>
            활동내용 라벨
            <input name="actLabel" defaultValue={settings.활동내용라벨} className={`${inputBase} w-36`} />
          </label>
          <label className={label}>
            결재라인 (쉼표로 구분)
            <input name="approvalLine" defaultValue={settings.결재라인.join(', ')} className={`${inputBase} w-64`} />
          </label>
          <button type="submit" className={btnSecondary}>사업 설정 저장</button>
          <div className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
            계획 목표 합계 {nf(totalGp)}명 / {nf(totalGc)}건 · 예산 소계 {nf(totalBudget)}천원
            {matches ? (
              <span className="text-emerald-600 dark:text-emerald-400"> · 총목표와 일치</span>
            ) : (
              <span className="text-[#b51c31] dark:text-red-400"> · 총목표와 {nf(Math.abs(totalGp - settings.총목표))}명 차이</span>
            )}
          </div>
        </form>
      </div>

      {rows.map(({ sub, plans }) => (
        <div key={sub.id} className={card}>
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
            <form action={updateSubAction} className="flex flex-1 flex-col gap-2">
              <input type="hidden" name="id" value={sub.id} />
              <input name="name" defaultValue={sub.세부사업명} className={`${inputBase} font-semibold`} />
              <textarea
                name="effect"
                defaultValue={sub.기대효과}
                placeholder="기대효과"
                className="min-h-[52px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button type="submit" className={`${btnSecondary} w-fit`}>저장</button>
            </form>
            <form action={deleteSubAction} className="shrink-0">
              <input type="hidden" name="id" value={sub.id} />
              <ConfirmSubmitButton confirmMessage="이 세부사업과 연결된 계획항목·산출근거가 모두 삭제됩니다. 계속할까요?" className={btnDanger}>
                세부사업 삭제
              </ConfirmSubmitButton>
            </form>
          </div>

          <div className="flex flex-col gap-3 p-4">
            {plans.map(({ plan, goal }) => (
              <div key={plan.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <form action={updatePlanAction} className="grid grid-cols-[1fr_140px_120px] items-start gap-2">
                  <input type="hidden" name="id" value={plan.id} />
                  <input name="title" defaultValue={plan.제목} className={inputSm} />
                  <select name="mode" defaultValue={plan.표기방식} className={selectFilter}>
                    <option value="merge">묶음(1행)</option>
                    <option value="sub">소분류 분리</option>
                    <option value="mid">중분류 분리</option>
                  </select>
                  <input name="budget" type="number" min="0" defaultValue={plan.예산} placeholder="예산(천원)" className={inputSm} />
                  <textarea
                    name="content"
                    defaultValue={plan.사업내용}
                    placeholder="사업내용"
                    className="col-span-3 min-h-[44px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <div className="col-span-2 text-xs text-zinc-500 dark:text-zinc-400">
                    목표: <span className="font-semibold text-brand">{nf(goal.gp)}명</span> / {nf(goal.gc)}건
                  </div>
                  <button type="submit" className={btnSecondary}>저장</button>
                </form>

                <div className="mt-2 flex flex-col gap-1.5">
                  {plan.basis.map((b) => (
                    <form key={b.id} action={updateBasisAction} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <input type="hidden" name="id" value={b.id} />
                      <input name="label" defaultValue={b.라벨} className={`${inputBase} w-40`} />
                      {b.직접입력여부 ? (
                        <>
                          <input name="gc" type="number" min="0" defaultValue={b.직접건} className={`${inputBase} w-20 text-right`} /> 건
                          <input name="gp" type="number" min="0" defaultValue={b.직접명} className={`${inputBase} w-20 text-right`} /> 명
                        </>
                      ) : (
                        <>
                          <input name="per" type="number" min="0" defaultValue={b.인원} className={`${inputBase} w-16 text-right`} /> 명 ×
                          <input name="times" type="number" min="0" defaultValue={b.횟수} className={`${inputBase} w-16 text-right`} />
                          <select name="unit" defaultValue={b.단위} className={selectFilter}>
                            {['월', '회', '일'].map((u) => <option key={u}>{u}</option>)}
                          </select>
                          <span className="text-zinc-400">= {nf(b.인원 * b.횟수)}명</span>
                        </>
                      )}
                      <label className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                        <input type="checkbox" name="direct" defaultChecked={b.직접입력여부} /> 직접입력
                      </label>
                      <button type="submit" className={btnSecondary}>저장</button>
                    </form>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <form action={addBasisAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="direct" value="0" />
                    <button type="submit" className={btnSecondary}>＋ 산출식 (인원×횟수)</button>
                  </form>
                  <form action={addBasisAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="direct" value="1" />
                    <button type="submit" className={btnSecondary}>＋ 직접 입력 (건/명)</button>
                  </form>
                  {plan.basis.length > 1 && (
                    <form action={deleteBasisAction} className="ml-auto flex items-center gap-1">
                      <select name="id" className={selectFilter}>
                        {plan.basis.map((b) => <option key={b.id} value={b.id}>{b.라벨 || '(라벨 없음)'} 삭제</option>)}
                      </select>
                      <button type="submit" className={btnDanger}>산출근거 삭제</button>
                    </form>
                  )}
                  <form action={deletePlanAction} className={plan.basis.length > 1 ? '' : 'ml-auto'}>
                    <input type="hidden" name="id" value={plan.id} />
                    <ConfirmSubmitButton confirmMessage="이 계획항목과 산출근거가 모두 삭제됩니다. 계속할까요?" className={btnDanger}>
                      계획항목 삭제
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}

            <form action={addPlanAction} className="flex gap-2">
              <input type="hidden" name="subId" value={sub.id} />
              <input name="title" placeholder="새 계획항목 제목" required className={input} />
              <button type="submit" className={btn}>＋ 계획항목 추가</button>
            </form>
          </div>
        </div>
      ))}

      <form action={addSubAction} className="flex gap-2">
        <input type="hidden" name="business" value={business} />
        <input name="name" placeholder="새 세부사업명" required className={input} />
        <input name="effect" placeholder="기대효과" className={input} />
        <button type="submit" className={btn}>＋ 세부사업 추가</button>
      </form>
    </div>
  );
}
