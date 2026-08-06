import { getBusinessList } from '@/lib/mutate/business';
import {
  buildWorklogItems,
  getBusinessPlanTree,
  getBusinessSettings,
  planGoal,
  type BasisRow,
  type BusinessSubNode,
  type PlanItem,
} from '@/lib/mutate/businessPlan';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { btn, btnDanger, btnSecondary, card, h2, hint, input, inputBase, label, selectFilter, statCard } from '@/lib/ui';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import CopyPlanTableButton from '@/components/business/CopyPlanTableButton';
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

const th = 'border border-[#c7ccd3] bg-[#eef1f5] px-2 py-2 text-center text-[11.5px] font-bold text-zinc-600 whitespace-nowrap dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
const td = 'border border-[#c7ccd3] px-2.5 py-2.5 align-top text-[12.5px] dark:border-zinc-700';
const MODE_LABEL: Record<string, string> = { merge: '묶음(1행)', sub: '소분류 분리', mid: '중분류 분리' };

function escHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

function basisLineText(b: BasisRow): string {
  if (b.직접입력여부) return `${b.라벨} ${nf(b.직접건)}건/${nf(b.직접명)}명`;
  return `${b.라벨} ${nf(b.인원)}명×${nf(b.횟수)}${b.단위}=${nf(b.인원 * b.횟수)}명`;
}

// 한글(HWP)에 붙여넣었을 때 표 모양이 살아나도록 클래스 대신 인라인 style만 쓴다(외부 CSS는
// 클립보드로 안 넘어간다) — input/select/textarea 없이 값만 담은, 실제 계획서와 같은 표.
const CELL = 'border:1px solid #333;padding:6px 8px;font-size:12px;vertical-align:top;font-family:"맑은 고딕","Malgun Gothic",sans-serif;';
const CELL_C = `${CELL}text-align:center;`;
const HEAD = `${CELL_C}background:#eef1f5;font-weight:700;`;

function buildPlanTableHtml(
  business: string,
  rows: { sub: BusinessSubNode; plans: { plan: PlanItem; goal: { gc: number; gp: number } }[] }[],
  totalGp: number,
  totalGc: number,
  totalBudget: number
): string {
  const totalDataRows = rows.reduce((a, r) => a + Math.max(r.plans.length, 1), 0);
  let body = '';
  let first = true;
  rows.forEach(({ sub, plans }) => {
    if (plans.length === 0) {
      body += `<tr>${first ? `<td style="${CELL_C}" rowspan="${totalDataRows + 1}">${escHtml(business)}</td>` : ''}` +
        `<td style="${CELL_C}font-weight:700;">${escHtml(sub.세부사업명)}</td>` +
        `<td style="${CELL_C}">-</td><td style="${CELL_C}">-</td><td style="${CELL}"></td>` +
        `<td style="${CELL}">${escHtml(sub.기대효과)}</td></tr>`;
      first = false;
      return;
    }
    plans.forEach(({ plan, goal }, pi) => {
      const basisText = plan.basis.map(basisLineText).join('<br/>');
      body += '<tr>';
      if (first) {
        body += `<td style="${CELL_C}" rowspan="${totalDataRows + 1}">${escHtml(business)}</td>`;
        first = false;
      }
      if (pi === 0) body += `<td style="${CELL_C}font-weight:700;" rowspan="${plans.length}">${escHtml(sub.세부사업명)}</td>`;
      body += `<td style="${CELL_C}">${nf(goal.gp)}명<br/>${nf(goal.gc)}건</td>`;
      body += `<td style="${CELL}text-align:right;">${nf(plan.예산)}</td>`;
      body += `<td style="${CELL}"><b>${pi + 1}) ${escHtml(plan.제목)}</b><br/>${escHtml(plan.사업내용)}${basisText ? `<br/>▪ ${basisText}` : ''}</td>`;
      if (pi === 0) body += `<td style="${CELL}" rowspan="${plans.length}">${escHtml(sub.기대효과)}</td>`;
      body += '</tr>';
    });
  });
  body += `<tr><td style="${HEAD}" colspan="2">소 계</td><td style="${HEAD}">${nf(totalGp)}명<br/>${nf(totalGc)}건</td>` +
    `<td style="${HEAD}text-align:right;">${nf(totalBudget)}</td><td style="${HEAD}" colspan="2"></td></tr>`;

  return `<table style="border-collapse:collapse;width:100%;"><thead><tr>` +
    `<th style="${HEAD}">사업분류</th><th style="${HEAD}">세부사업</th><th style="${HEAD}">목표<br/>(회·건·명)</th>` +
    `<th style="${HEAD}">예산<br/>(천원)</th><th style="${HEAD}">사 업 내 용</th><th style="${HEAD}">기 대 효 과</th>` +
    `</tr></thead><tbody>${body}</tbody></table>`;
}

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

  const [settings, tree, worklogItems] = await Promise.all([
    getBusinessSettings(business),
    getBusinessPlanTree(business),
    buildWorklogItems(business),
  ]);

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
  const planTableHtml = buildPlanTableHtml(business, rows, totalGp, totalGc, totalBudget);

  return (
    <div>
      <div className="mb-5 rounded-md border-l-[3px] border-l-brand bg-brand-tint/40 px-4 py-3 text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        <b className="text-brand">산출근거 한 줄 = 업무일지 한 항목.</b> &ldquo;150명 × 24회&rdquo;를 입력하면 업무일지에{' '}
        <b>목표 건수 24 / 목표 인원 3,600</b>이 그대로 들어갑니다. 계획서를 고치면 일지 목표도 같이 바뀝니다.
      </div>

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
        </form>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={statCard}>
          <div className="text-[10.5px] font-semibold tracking-wide text-zinc-400">계획 목표 합계</div>
          <div className="mt-1 text-xl font-bold text-zinc-800 dark:text-zinc-100">
            {nf(totalGp)}<span className="ml-1 text-xs font-normal text-zinc-400">명</span>
          </div>
          <div className="text-[11px] text-zinc-400">{nf(totalGc)}건</div>
        </div>
        <div className={statCard}>
          <div className="text-[10.5px] font-semibold tracking-wide text-zinc-400">예산 소계</div>
          <div className="mt-1 text-xl font-bold text-zinc-800 dark:text-zinc-100">
            {nf(totalBudget)}<span className="ml-1 text-xs font-normal text-zinc-400">천원</span>
          </div>
        </div>
        <div className={statCard}>
          <div className="text-[10.5px] font-semibold tracking-wide text-zinc-400">총목표</div>
          <div className="mt-1 text-xl font-bold text-zinc-800 dark:text-zinc-100">
            {nf(settings.총목표)}<span className="ml-1 text-xs font-normal text-zinc-400">명</span>
          </div>
        </div>
        <div className={statCard}>
          <div className="text-[10.5px] font-semibold tracking-wide text-zinc-400">검증</div>
          <div className={`mt-1 text-sm font-bold ${matches ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#b51c31] dark:text-red-400'}`}>
            {matches ? '✓ 목표 합계 일치' : `△ ${nf(Math.abs(totalGp - settings.총목표))}명 차이`}
          </div>
          <div className="text-[11px] text-zinc-400">업무일지 항목 {worklogItems.length}개 생성</div>
        </div>
      </div>

      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className={h2}>{business} 세부사업계획(안) <span className="ml-2 text-xs font-normal text-zinc-400">단위 : 천원</span></h2>
          <CopyPlanTableButton html={planTableHtml} className={btnSecondary} />
        </div>
        <div className="overflow-x-auto rounded-md border border-[#8f8a7d] dark:border-zinc-700">
          <table className="w-full min-w-[1180px] border-collapse text-[12.5px]">
            <colgroup>
              <col className="w-[42px]" />
              <col className="w-[170px]" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
              <col />
              <col className="w-[220px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={th}>사업분류</th>
                <th className={th}>세부사업</th>
                <th className={th}>목표<br />(회·건·명)</th>
                <th className={th}>예산</th>
                <th className={th}>사 업 내 용</th>
                <th className={th}>기 대 효 과</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalDataRows = rows.reduce((a, r) => a + Math.max(r.plans.length, 1), 0);
                let firstRowRendered = false;
                return rows.map(({ sub, plans }) => {
                  if (plans.length === 0) {
                    const isFirst = !firstRowRendered;
                    firstRowRendered = true;
                    return (
                      <tr key={sub.id}>
                        {isFirst && <BusinessClsCell business={business} rowSpan={totalDataRows + 1} />}
                        <td className={`${td} bg-[#f7f5ef] text-center font-bold dark:bg-zinc-800/60`}>
                          <SubNameForm sub={sub} />
                        </td>
                        <td className={`${td} text-center text-zinc-400`}>-</td>
                        <td className={`${td} text-center text-zinc-400`}>-</td>
                        <td className={td}>
                          <form action={addPlanAction} className="flex gap-2">
                            <input type="hidden" name="subId" value={sub.id} />
                            <input name="title" placeholder="새 계획항목 제목" required className={input} />
                            <button type="submit" className={btn}>＋ 계획항목 추가</button>
                          </form>
                        </td>
                        <td className={`${td} bg-[#fcfbf8]`}>
                          <EffectForm sub={sub} />
                        </td>
                      </tr>
                    );
                  }
                  return plans.map(({ plan, goal }, pi) => {
                    const isFirst = !firstRowRendered;
                    firstRowRendered = true;
                    return (
                      <tr key={plan.id}>
                        {isFirst && <BusinessClsCell business={business} rowSpan={totalDataRows + 1} />}
                        {pi === 0 && (
                          <td className={`${td} bg-[#f7f5ef] text-center font-bold dark:bg-zinc-800/60`} rowSpan={plans.length}>
                            <SubNameForm sub={sub} />
                            <div className="mt-2 flex flex-col gap-1">
                              <form action={addPlanAction}>
                                <input type="hidden" name="subId" value={sub.id} />
                                <input type="hidden" name="title" value="새 계획항목" />
                                <button type="submit" className={`${btnSecondary} w-full`}>＋ 계획</button>
                              </form>
                              <form action={deleteSubAction}>
                                <input type="hidden" name="id" value={sub.id} />
                                <ConfirmSubmitButton
                                  confirmMessage="이 세부사업과 연결된 계획항목·산출근거가 모두 삭제됩니다. 계속할까요?"
                                  className={`${btnDanger} w-full`}
                                >
                                  세부사업 삭제
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </td>
                        )}
                        <td className={`${td} bg-[#fcfbf8] text-right`}>
                          <form id={`plan-${plan.id}`} action={updatePlanAction}>
                            <input type="hidden" name="id" value={plan.id} />
                          </form>
                          <div className="text-[15px] font-bold text-brand">{nf(goal.gp)}<span className="ml-0.5 text-[11px] font-normal text-zinc-400">명</span></div>
                          <div className="text-[11px] text-zinc-400">{nf(goal.gc)}건</div>
                        </td>
                        <td className={`${td} bg-[#fcfbf8]`}>
                          <input
                            form={`plan-${plan.id}`}
                            name="budget"
                            type="number"
                            min="0"
                            defaultValue={plan.예산}
                            className={`${inputBase} w-full text-right`}
                          />
                        </td>
                        <td className={td}>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-zinc-400">{pi + 1})</span>
                            <input form={`plan-${plan.id}`} name="title" defaultValue={plan.제목} className={`${inputSm} font-bold`} />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <label className="flex items-center gap-1">
                              업무일지 표기
                              <select form={`plan-${plan.id}`} name="mode" defaultValue={plan.표기방식} className={selectFilter}>
                                {Object.entries(MODE_LABEL).map(([m, l]) => <option key={m} value={m}>{l}</option>)}
                              </select>
                            </label>
                            <button type="submit" form={`plan-${plan.id}`} className={btnSecondary}>계획 저장</button>
                          </div>
                          <div className="mt-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">‧ 사업내용</div>
                          <textarea
                            form={`plan-${plan.id}`}
                            name="content"
                            defaultValue={plan.사업내용}
                            placeholder="사업내용"
                            className="min-h-[52px] w-full rounded-md border border-zinc-200 bg-[#fcfbf8] px-3 py-2 text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
                          />

                          <div className="mt-2 rounded-md border border-zinc-200 bg-[#f8f6f0] p-2 dark:border-zinc-700 dark:bg-zinc-900/40">
                            <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">‧ 산출근거</div>
                            <div className="mt-1 flex flex-col gap-1.5">
                              {plan.basis.map((b) => (
                                <form key={b.id} action={updateBasisAction} className="flex flex-wrap items-center gap-1.5 text-xs">
                                  <input type="hidden" name="id" value={b.id} />
                                  <input name="label" defaultValue={b.라벨} className={`${inputBase} w-40`} />
                                  {b.직접입력여부 ? (
                                    <>
                                      <span className="rounded-full bg-[#faf0ee] px-1.5 py-0.5 text-[10px] font-bold text-[#a63228] dark:bg-red-950/30 dark:text-red-300">직접</span>
                                      <input name="gc" type="number" min="0" defaultValue={b.직접건} className={`${inputBase} w-16 text-right`} /> 건
                                      <input name="gp" type="number" min="0" defaultValue={b.직접명} className={`${inputBase} w-16 text-right`} /> 명
                                    </>
                                  ) : (
                                    <>
                                      <input name="per" type="number" min="0" defaultValue={b.인원} className={`${inputBase} w-16 text-right`} /> 명 ×
                                      <input name="times" type="number" min="0" defaultValue={b.횟수} className={`${inputBase} w-16 text-right`} />
                                      <select name="unit" defaultValue={b.단위} className={selectFilter}>
                                        {['월', '회', '일'].map((u) => <option key={u}>{u}</option>)}
                                      </select>
                                      <span className="font-bold text-brand">= {nf(b.인원 * b.횟수)}명</span>
                                    </>
                                  )}
                                  <label className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                    <input type="checkbox" name="direct" defaultChecked={b.직접입력여부} /> 직접입력
                                  </label>
                                  <button type="submit" className={btnSecondary}>저장</button>
                                </form>
                              ))}
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5">
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
                                  <button type="submit" className={btnDanger}>삭제</button>
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
                        </td>
                        {pi === 0 && (
                          <td className={`${td} bg-[#fcfbf8]`} rowSpan={plans.length}>
                            <EffectForm sub={sub} />
                          </td>
                        )}
                      </tr>
                    );
                  });
                });
              })()}
              <tr className="bg-[#eef1f5] font-bold dark:bg-zinc-800">
                <td className={td} colSpan={2}>소 계</td>
                <td className={`${td} text-right`}>{nf(totalGp)}명<div className="text-[11px] font-normal text-zinc-400">{nf(totalGc)}건</div></td>
                <td className={`${td} text-right`}>{nf(totalBudget)}</td>
                <td className={td} colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <form action={addSubAction} className="mt-3 flex gap-2">
          <input type="hidden" name="business" value={business} />
          <input name="name" placeholder="새 세부사업명" required className={input} />
          <input name="effect" placeholder="기대효과" className={input} />
          <button type="submit" className={btn}>＋ 세부사업 추가</button>
        </form>
      </div>

      <div className={card}>
        <h2 className={h2}>생성된 업무일지 항목 <span className="ml-2 text-xs font-normal text-zinc-400">{worklogItems.length}개</span></h2>
        <p className={hint}>목표설정 표의 산출근거가 이 항목들로 파생되어 일계입력·월별현황에 그대로 쓰입니다.</p>
        <div className="overflow-x-auto rounded-md border border-[#c7ccd3] dark:border-zinc-700">
          <table className="w-full min-w-[600px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className={th}>세부사업</th>
                <th className={th}>중분류</th>
                <th className={th}>소분류</th>
                <th className={th}>목표건</th>
                <th className={th}>목표명</th>
              </tr>
            </thead>
            <tbody>
              {worklogItems.map((i) => (
                <tr key={i.id}>
                  <td className={td}>{i.세부사업명}</td>
                  <td className={td}>{i.중분류}</td>
                  <td className={td}>{i.소분류 || <span className="text-zinc-400">-</span>}</td>
                  <td className={`${td} text-right`}>{nf(i.목표건)}</td>
                  <td className={`${td} text-right`}>{nf(i.목표명)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BusinessClsCell({ business, rowSpan }: { business: string; rowSpan: number }) {
  return (
    <td className={`${td} bg-[#f1efe8] text-center font-bold dark:bg-zinc-800`} rowSpan={rowSpan}>
      <div className="mx-auto [text-orientation:upright] [writing-mode:vertical-rl] tracking-wide">{business}</div>
    </td>
  );
}

function SubNameForm({ sub }: { sub: { id: string; 세부사업명: string; 기대효과: string } }) {
  return (
    <form action={updateSubAction} className="flex flex-col items-center gap-1.5">
      <input type="hidden" name="id" value={sub.id} />
      <input type="hidden" name="effect" value={sub.기대효과} />
      <input name="name" defaultValue={sub.세부사업명} className={`${inputBase} w-full text-center font-bold`} />
      <button type="submit" className={btnSecondary}>저장</button>
    </form>
  );
}

function EffectForm({ sub }: { sub: { id: string; 세부사업명: string; 기대효과: string } }) {
  return (
    <form action={updateSubAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="id" value={sub.id} />
      <input type="hidden" name="name" value={sub.세부사업명} />
      <textarea
        name="effect"
        defaultValue={sub.기대효과}
        placeholder="기대효과"
        className="min-h-[120px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
      />
      <button type="submit" className={`${btnSecondary} w-fit`}>저장</button>
    </form>
  );
}
