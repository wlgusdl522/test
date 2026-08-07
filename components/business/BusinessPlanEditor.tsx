'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addBasisAction,
  addPlanAction,
  addSubAction,
  deleteBasisAction,
  deletePlanAction,
  deleteSubAction,
  saveBusinessPlanAction,
} from '@/app/(portal)/business/actions';
import type { BasisRow, BusinessSubNode, PlanItem } from '@/lib/mutate/businessPlan';
import { btn, btnDanger, btnSecondary, card, h2, input, inputBase, selectFilter, statCard } from '@/lib/ui';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');
const inputSm = `${inputBase} w-full`;
const th = 'border border-[#c7ccd3] bg-[#eef1f5] px-2 py-2 text-center text-[11.5px] font-bold text-zinc-600 whitespace-nowrap dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
const td = 'border border-[#c7ccd3] px-2.5 py-2.5 align-top text-[12.5px] dark:border-zinc-700';
const MODE_LABEL: Record<string, string> = { merge: '중분류만 표기', sub: '중분류·소분류 표기', mid: '산출근거만 표기' };

function lineGoal(x: BasisRow): [number, number] {
  return x.직접입력여부 ? [x.직접건, x.직접명] : [x.횟수, x.인원 * x.횟수];
}
function planGoal(plan: PlanItem): { gc: number; gp: number } {
  if (plan.basis.length === 0) return { gc: 0, gp: 0 };
  if (plan.표기방식 === 'merge') {
    let gc = 0;
    let gp = 0;
    plan.basis.forEach((x) => {
      const [c, p] = lineGoal(x);
      gc = Math.max(gc, c);
      gp += p;
    });
    return { gc, gp };
  }
  return plan.basis.reduce((acc, x) => {
    const [c, p] = lineGoal(x);
    return { gc: acc.gc + c, gp: acc.gp + p };
  }, { gc: 0, gp: 0 });
}
function planItemCount(plan: PlanItem): number {
  if (plan.basis.length === 0) return 0;
  return plan.표기방식 === 'merge' ? 1 : plan.basis.length;
}

function structureKey(subs: BusinessSubNode[]): string {
  return subs.map((s) => `${s.id}:${s.plans.map((p) => `${p.id}:${p.basis.map((b) => b.id).join(',')}`).join('|')}`).join(';');
}

export default function BusinessPlanEditor({
  business,
  initialSubs,
  settingsToggle,
}: {
  business: string;
  initialSubs: BusinessSubNode[];
  settingsToggle?: React.ReactNode;
}) {
  const [subs, setSubs] = useState<BusinessSubNode[]>(initialSubs);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  // 계획항목/세부사업/산출근거를 추가·삭제하면(구조가 바뀌면) 서버에서 새로 내려온 목록으로
  // 맞춰준다 — 값만 편집 중일 때(구조 동일)는 타이핑 중인 로컬 상태를 그대로 유지한다.
  useEffect(() => {
    setSubs(initialSubs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, structureKey(initialSubs)]);

  function patchSub(subId: string, patch: Partial<BusinessSubNode>) {
    setSubs((prev) => prev.map((s) => (s.id === subId ? { ...s, ...patch } : s)));
  }
  function patchPlan(subId: string, planId: string, patch: Partial<PlanItem>) {
    setSubs((prev) => prev.map((s) => (s.id !== subId ? s : {
      ...s,
      plans: s.plans.map((p) => (p.id === planId ? { ...p, ...patch } : p)),
    })));
  }
  function patchBasis(subId: string, planId: string, basisId: string, patch: Partial<BasisRow>) {
    setSubs((prev) => prev.map((s) => (s.id !== subId ? s : {
      ...s,
      plans: s.plans.map((p) => (p.id !== planId ? p : {
        ...p,
        basis: p.basis.map((b) => (b.id === basisId ? { ...b, ...patch } : b)),
      })),
    })));
  }

  const totals = subs.reduce(
    (acc, s) => {
      s.plans.forEach((p) => {
        const g = planGoal(p);
        acc.gp += g.gp;
        acc.gc += g.gc;
        acc.budget += p.예산;
        acc.items += planItemCount(p);
      });
      return acc;
    },
    { gp: 0, gc: 0, budget: 0, items: 0 }
  );
  const totalDataRows = subs.reduce((a, s) => a + Math.max(s.plans.length, 1), 0);

  function onSave() {
    startTransition(async () => {
      await saveBusinessPlanAction(subs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    });
  }

  let firstRowRendered = false;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={statCard}>
          <div className="text-[10.5px] font-semibold tracking-wide text-zinc-400">총목표(계획 목표 합계)</div>
          <div className="mt-1 text-xl font-bold text-zinc-800 dark:text-zinc-100">
            {nf(totals.gp)}<span className="ml-1 text-xs font-normal text-zinc-400">명</span>
          </div>
          <div className="text-[11px] text-zinc-400">{nf(totals.gc)}건</div>
        </div>
        <div className={statCard}>
          <div className="text-[10.5px] font-semibold tracking-wide text-zinc-400">예산 소계</div>
          <div className="mt-1 text-xl font-bold text-zinc-800 dark:text-zinc-100">
            {nf(totals.budget)}<span className="ml-1 text-xs font-normal text-zinc-400">천원</span>
          </div>
        </div>
        <div className={statCard}>
          <div className="text-[10.5px] font-semibold tracking-wide text-zinc-400">업무일지 항목</div>
          <div className="mt-1 text-xl font-bold text-zinc-800 dark:text-zinc-100">
            {nf(totals.items)}<span className="ml-1 text-xs font-normal text-zinc-400">개</span>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className={h2}>{business} 세부사업계획(안) <span className="ml-2 text-xs font-normal text-zinc-400">단위 : 천원</span></h2>
          <div className="flex items-center gap-3">
            {settingsToggle}
            <button type="button" onClick={onSave} disabled={pending} className={btn}>
              {pending ? '저장 중...' : saved ? '저장됨 ✓' : '변경사항 저장'}
            </button>
          </div>
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
              {subs.map((sub) => {
                if (sub.plans.length === 0) {
                  const isFirst = !firstRowRendered;
                  firstRowRendered = true;
                  return (
                    <tr key={sub.id}>
                      {isFirst && (
                        <td className={`${td} bg-[#f1efe8] text-center font-bold dark:bg-zinc-800`} rowSpan={totalDataRows + 1}>
                          <div className="mx-auto [text-orientation:upright] [writing-mode:vertical-rl] tracking-wide">{business}</div>
                        </td>
                      )}
                      <td className={`${td} bg-[#f7f5ef] text-center font-bold dark:bg-zinc-800/60`}>
                        <input
                          value={sub.세부사업명}
                          onChange={(e) => patchSub(sub.id, { 세부사업명: e.target.value })}
                          className={`${inputBase} w-full text-center font-bold`}
                        />
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
                        <textarea
                          value={sub.기대효과}
                          onChange={(e) => patchSub(sub.id, { 기대효과: e.target.value })}
                          placeholder="기대효과"
                          className="min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </td>
                    </tr>
                  );
                }
                return sub.plans.map((plan, pi) => {
                  const isFirst = !firstRowRendered;
                  firstRowRendered = true;
                  const goal = planGoal(plan);
                  return (
                    <tr key={plan.id}>
                      {isFirst && (
                        <td className={`${td} bg-[#f1efe8] text-center font-bold dark:bg-zinc-800`} rowSpan={totalDataRows + 1}>
                          <div className="mx-auto [text-orientation:upright] [writing-mode:vertical-rl] tracking-wide">{business}</div>
                        </td>
                      )}
                      {pi === 0 && (
                        <td className={`${td} bg-[#f7f5ef] text-center font-bold dark:bg-zinc-800/60`} rowSpan={sub.plans.length}>
                          <div className="flex flex-col items-center gap-1.5">
                            <input
                              value={sub.세부사업명}
                              onChange={(e) => patchSub(sub.id, { 세부사업명: e.target.value })}
                              className={`${inputBase} w-full text-center font-bold`}
                            />
                          </div>
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
                        <div className="text-[15px] font-bold text-brand">{nf(goal.gp)}<span className="ml-0.5 text-[11px] font-normal text-zinc-400">명</span></div>
                        <div className="text-[11px] text-zinc-400">{nf(goal.gc)}건</div>
                      </td>
                      <td className={`${td} bg-[#fcfbf8]`}>
                        <input
                          type="number"
                          min="0"
                          value={plan.예산}
                          onChange={(e) => patchPlan(sub.id, plan.id, { 예산: Number(e.target.value) || 0 })}
                          className={`${inputBase} w-full text-right`}
                        />
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-zinc-400">{pi + 1})</span>
                          <input
                            value={plan.제목}
                            onChange={(e) => patchPlan(sub.id, plan.id, { 제목: e.target.value })}
                            className={`${inputSm} font-bold`}
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <label className="flex items-center gap-1">
                            업무일지 표기
                            <select
                              value={plan.표기방식}
                              onChange={(e) => patchPlan(sub.id, plan.id, { 표기방식: e.target.value as PlanItem['표기방식'] })}
                              className={selectFilter}
                            >
                              {Object.entries(MODE_LABEL).map(([m, l]) => <option key={m} value={m}>{l}</option>)}
                            </select>
                          </label>
                        </div>
                        <div className="mt-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">‧ 사업내용</div>
                        <textarea
                          value={plan.사업내용}
                          onChange={(e) => patchPlan(sub.id, plan.id, { 사업내용: e.target.value })}
                          placeholder="사업내용"
                          className="min-h-[52px] w-full rounded-md border border-zinc-200 bg-[#fcfbf8] px-3 py-2 text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
                        />

                        <div className="mt-2 rounded-md border border-zinc-200 bg-[#f8f6f0] p-2 dark:border-zinc-700 dark:bg-zinc-900/40">
                          <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">‧ 산출근거</div>
                          <div className="mt-1 flex flex-col gap-1.5">
                            {plan.basis.map((b) => (
                              <div key={b.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                                <input
                                  value={b.라벨}
                                  onChange={(e) => patchBasis(sub.id, plan.id, b.id, { 라벨: e.target.value })}
                                  className={`${inputBase} w-40`}
                                />
                                {b.직접입력여부 ? (
                                  <>
                                    <span className="rounded-full bg-[#faf0ee] px-1.5 py-0.5 text-[10px] font-bold text-[#a63228] dark:bg-red-950/30 dark:text-red-300">직접</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={b.직접건}
                                      onChange={(e) => patchBasis(sub.id, plan.id, b.id, { 직접건: Number(e.target.value) || 0 })}
                                      className={`${inputBase} w-16 text-right`}
                                    /> 건
                                    <input
                                      type="number"
                                      min="0"
                                      value={b.직접명}
                                      onChange={(e) => patchBasis(sub.id, plan.id, b.id, { 직접명: Number(e.target.value) || 0 })}
                                      className={`${inputBase} w-16 text-right`}
                                    /> 명
                                  </>
                                ) : (
                                  <>
                                    <input
                                      type="number"
                                      min="0"
                                      value={b.인원}
                                      onChange={(e) => patchBasis(sub.id, plan.id, b.id, { 인원: Number(e.target.value) || 0 })}
                                      className={`${inputBase} w-16 text-right`}
                                    /> 명 ×
                                    <input
                                      type="number"
                                      min="0"
                                      value={b.횟수}
                                      onChange={(e) => patchBasis(sub.id, plan.id, b.id, { 횟수: Number(e.target.value) || 0 })}
                                      className={`${inputBase} w-16 text-right`}
                                    />
                                    <select
                                      value={b.단위}
                                      onChange={(e) => patchBasis(sub.id, plan.id, b.id, { 단위: e.target.value })}
                                      className={selectFilter}
                                    >
                                      {['월', '회', '일'].map((u) => <option key={u}>{u}</option>)}
                                    </select>
                                    <span className="font-bold text-brand">= {nf(b.인원 * b.횟수)}명</span>
                                  </>
                                )}
                                <label className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                  <input
                                    type="checkbox"
                                    checked={b.직접입력여부}
                                    onChange={(e) => patchBasis(sub.id, plan.id, b.id, { 직접입력여부: e.target.checked })}
                                  /> 직접입력
                                </label>
                              </div>
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
                        <td className={`${td} bg-[#fcfbf8]`} rowSpan={sub.plans.length}>
                          <textarea
                            value={sub.기대효과}
                            onChange={(e) => patchSub(sub.id, { 기대효과: e.target.value })}
                            placeholder="기대효과"
                            className="min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </td>
                      )}
                    </tr>
                  );
                });
              })}
              <tr className="bg-[#eef1f5] font-bold dark:bg-zinc-800">
                <td className={td} colSpan={2}>소 계</td>
                <td className={`${td} text-right`}>{nf(totals.gp)}명<div className="text-[11px] font-normal text-zinc-400">{nf(totals.gc)}건</div></td>
                <td className={`${td} text-right`}>{nf(totals.budget)}</td>
                <td className={td} colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <form action={addSubAction} className="mt-3">
          <input type="hidden" name="business" value={business} />
          <button type="submit" className={btn}>＋ 세부사업 추가</button>
        </form>
      </div>
    </div>
  );
}
