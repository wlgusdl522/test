'use client';

import { Fragment, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnSecondary, cardTableWrap, inputBase, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { addGeneralLogCategoryAction, deleteGeneralLogCategoryAction, saveGeneralLogDayAction, type GeneralLogTargetUpdate } from '@/app/(portal)/general-work-log/actions';
import type { GeneralLogRollupRow, GeneralLogContentRow } from '@/lib/mutate/generalLog';

type ContentRow = { key: string; content: string };
type Counts = Record<string, { 건: string; 명: string }>;
type Targets = Record<string, { 목표건: string; 목표명: string }>;
type NewCategoryDraft = { 대분류: string; 중분류: string; 세부항목: string; 목표건: string; 목표명: string };

function toContentRows(rows: GeneralLogContentRow[]): ContentRow[] {
  if (rows.length === 0) return [{ key: crypto.randomUUID(), content: '' }];
  return rows.map((r) => ({ key: r.id, content: r.업무내용 }));
}

const numInput = `${inputBase} w-16 text-right px-1.5`;
const emptyDraft: NewCategoryDraft = { 대분류: '', 중분류: '', 세부항목: '', 목표건: '', 목표명: '' };

function rate(actual: number, target: number): number {
  return target > 0 ? Math.round((actual / target) * 1000) / 10 : 0;
}

export default function GeneralLogWorkspace({
  business,
  date,
  rollup,
  initialContent,
  initialNote,
}: {
  business: string;
  date: string;
  rollup: GeneralLogRollupRow[];
  initialContent: GeneralLogContentRow[];
  initialNote: string;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>(() =>
    Object.fromEntries(
      rollup.map((r) => [r.id, { 건: r.일계건 ? String(r.일계건) : '', 명: r.일계명 ? String(r.일계명) : '' }])
    )
  );
  const [targets, setTargets] = useState<Targets>(() =>
    Object.fromEntries(rollup.map((r) => [r.id, { 목표건: r.목표건, 목표명: r.목표명 }]))
  );
  const [contentRows, setContentRows] = useState<ContentRow[]>(() => toContentRows(initialContent));
  const [note, setNote] = useState(initialNote);
  const [newCategory, setNewCategory] = useState<NewCategoryDraft>(emptyDraft);
  const [statusText, setStatusText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isAddingCategory, startAddingCategory] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeletingCategory] = useTransition();

  // 아직 로컬 상태에 키가 없는(방금 추가된) 항목의 한쪽 필드만 고치더라도, 다른쪽 필드는 서버 값으로
  // 채워 넣어야 나머지 필드가 빈 값으로 날아가지 않는다.
  function setCount(itemId: string, field: '건' | '명', value: string) {
    setCounts((prev) => {
      const row = rollup.find((r) => r.id === itemId);
      const seed = prev[itemId] ?? { 건: row?.일계건 ? String(row.일계건) : '', 명: row?.일계명 ? String(row.일계명) : '' };
      return { ...prev, [itemId]: { ...seed, [field]: value } };
    });
  }

  function setTarget(itemId: string, field: '목표건' | '목표명', value: string) {
    setTargets((prev) => {
      const row = rollup.find((r) => r.id === itemId);
      const seed = prev[itemId] ?? { 목표건: row?.목표건 ?? '', 목표명: row?.목표명 ?? '' };
      return { ...prev, [itemId]: { ...seed, [field]: value } };
    });
  }

  function addContentRow() {
    setContentRows((prev) => [...prev, { key: crypto.randomUUID(), content: '' }]);
  }

  function removeContentRow(key: string) {
    setContentRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateContentRow(key: string, value: string) {
    setContentRows((prev) => prev.map((r) => (r.key === key ? { ...r, content: value } : r)));
  }

  function handleAddCategory() {
    if (!newCategory.세부항목.trim()) return;
    startAddingCategory(async () => {
      try {
        await addGeneralLogCategoryAction({
          사업명: business,
          대분류: newCategory.대분류,
          중분류: newCategory.중분류,
          세부항목: newCategory.세부항목,
          정렬순서: String(rollup.length),
          목표건: newCategory.목표건,
          목표명: newCategory.목표명,
        });
        setNewCategory(emptyDraft);
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '구분항목 추가 실패');
      }
    });
  }

  function handleDeleteCategory(row: GeneralLogRollupRow) {
    if (!window.confirm(`"${row.세부항목}" 항목을 삭제할까요? 이미 입력된 일계 데이터는 남지만 화면에는 더 이상 보이지 않습니다.`)) {
      return;
    }
    setDeletingId(row.id);
    startDeletingCategory(async () => {
      try {
        await deleteGeneralLogCategoryAction(row.id);
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '구분항목 삭제 실패');
      } finally {
        setDeletingId(null);
      }
    });
  }

  function handleSubmit() {
    const dailyEntries = rollup.map((r) => ({
      항목ID: r.id,
      건: countFor(r, '건'),
      명: countFor(r, '명'),
    }));
    const rowsToSave = contentRows
      .filter((r) => r.content.trim())
      .map((r) => ({ 업무내용: r.content }));
    // 목표값을 바꾼 항목만 골라서 보낸다 — rollup(서버가 내려준 최신값)과 다른 것만 변경으로 취급하므로,
    // "행 추가" 직후 새로고침 없이 바로 목표를 고쳐도 정확히 잡힌다.
    const targetUpdates: GeneralLogTargetUpdate[] = rollup
      .filter((r) => targetFor(r, '목표건') !== (r.목표건 ?? '') || targetFor(r, '목표명') !== (r.목표명 ?? ''))
      .map((r) => ({
        id: r.id,
        사업명: r.사업명,
        대분류: r.대분류,
        중분류: r.중분류,
        세부항목: r.세부항목,
        정렬순서: String(r.정렬순서),
        목표건: targetFor(r, '목표건'),
        목표명: targetFor(r, '목표명'),
      }));

    setStatusText('저장 중...');
    startTransition(async () => {
      try {
        await saveGeneralLogDayAction(business, date, dailyEntries, rowsToSave, note, targetUpdates);
        setStatusText('저장 완료');
        router.refresh();
      } catch (err) {
        setStatusText(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  // 정렬순서로 이미 정렬돼 들어오므로, 연속으로 같은 (대분류,중분류)인 행끼리 묶어 소계를 붙인다.
  const groups: { 대분류: string; 중분류: string; rows: GeneralLogRollupRow[] }[] = [];
  for (const row of rollup) {
    const last = groups[groups.length - 1];
    if (last && last.대분류 === row.대분류 && last.중분류 === row.중분류) last.rows.push(row);
    else groups.push({ 대분류: row.대분류, 중분류: row.중분류, rows: [row] });
  }

  function groupSum(rows: GeneralLogRollupRow[], field: keyof GeneralLogRollupRow): number {
    return rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
  }
  // 방금 "행 추가"로 만든 항목은 새로고침 직후 counts/targets 로컬 상태에 아직 키가 없으므로,
  // 그럴 땐 서버가 내려준 rollup 행 값을 그대로 쓴다(0/빈 값으로 잘못 표시되는 것을 막는다).
  function countFor(row: GeneralLogRollupRow, field: '건' | '명'): string {
    const local = counts[row.id]?.[field];
    if (local !== undefined) return local;
    const serverVal = field === '건' ? row.일계건 : row.일계명;
    return serverVal ? String(serverVal) : '';
  }
  function targetFor(row: GeneralLogRollupRow, field: '목표건' | '목표명'): string {
    return targets[row.id]?.[field] ?? (field === '목표건' ? row.목표건 : row.목표명);
  }
  function groupCountSum(rows: GeneralLogRollupRow[], field: '건' | '명'): number {
    return rows.reduce((acc, r) => acc + Number(countFor(r, field) || 0), 0);
  }
  function groupTargetSum(rows: GeneralLogRollupRow[], field: '목표건' | '목표명'): number {
    return rows.reduce((acc, r) => acc + Number(targetFor(r, field) || 0), 0);
  }

  const grandTargetCount = groupTargetSum(rollup, '목표건');
  const grandTargetPeople = groupTargetSum(rollup, '목표명');
  const grandCumCount = groupSum(rollup, '누계건');
  const grandCumPeople = groupSum(rollup, '누계명');

  let prevMajor = '';

  return (
    <div className="flex flex-col gap-6">
      <div className={cardTableWrap}>
        <table className={tableClean}>
          <thead>
            <tr>
              <th className={thClean}>구분</th>
              <th className={thClean}>세부항목</th>
              <th className={thClean}>목표(건)</th>
              <th className={thClean}>목표(명)</th>
              <th className={thClean}>일계(건)</th>
              <th className={thClean}>일계(명)</th>
              <th className={thClean}>월계(건)</th>
              <th className={thClean}>월계(명)</th>
              <th className={thClean}>누계(건)</th>
              <th className={thClean}>누계(명)</th>
              <th className={thClean}>달성율(건)</th>
              <th className={thClean}>달성율(명)</th>
              <th className={thClean}></th>
            </tr>
          </thead>
          <tbody>
            {rollup.length === 0 && (
              <tr>
                <td className={tdClean} colSpan={13}>
                  <span className="text-zinc-400">등록된 구분항목이 없습니다. 아래에서 첫 항목을 추가해주세요.</span>
                </td>
              </tr>
            )}
            {groups.map((group, gi) => {
              const showMajor = group.대분류 !== prevMajor;
              prevMajor = group.대분류;
              return (
                <Fragment key={gi}>
                  {group.rows.map((row, ri) => (
                    <tr key={row.id} className={trHoverClean}>
                      {ri === 0 && (
                        <td className={tdClean} rowSpan={group.rows.length}>
                          {showMajor && <div className="font-semibold text-zinc-800 dark:text-zinc-100">{group.대분류}</div>}
                          <div className="text-zinc-500 dark:text-zinc-400 text-xs">{group.중분류}</div>
                        </td>
                      )}
                      <td className={tdClean}>{row.세부항목}</td>
                      <td className={tdClean}>
                        <input
                          className={numInput}
                          value={targetFor(row, '목표건')}
                          onChange={(e) => setTarget(row.id, '목표건', e.target.value)}
                          inputMode="numeric"
                        />
                      </td>
                      <td className={tdClean}>
                        <input
                          className={numInput}
                          value={targetFor(row, '목표명')}
                          onChange={(e) => setTarget(row.id, '목표명', e.target.value)}
                          inputMode="numeric"
                        />
                      </td>
                      <td className={tdClean}>
                        <input
                          className={numInput}
                          value={countFor(row, '건')}
                          onChange={(e) => setCount(row.id, '건', e.target.value)}
                          inputMode="numeric"
                        />
                      </td>
                      <td className={tdClean}>
                        <input
                          className={numInput}
                          value={countFor(row, '명')}
                          onChange={(e) => setCount(row.id, '명', e.target.value)}
                          inputMode="numeric"
                        />
                      </td>
                      <td className={`${tdClean} text-right`}>{row.월계건 || '-'}</td>
                      <td className={`${tdClean} text-right`}>{row.월계명 || '-'}</td>
                      <td className={`${tdClean} text-right`}>{row.누계건 || '-'}</td>
                      <td className={`${tdClean} text-right`}>{row.누계명 || '-'}</td>
                      <td className={`${tdClean} text-right`}>{row.달성율건}</td>
                      <td className={`${tdClean} text-right`}>{row.달성율명}</td>
                      <td className={tdClean}>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(row)}
                          disabled={deletingId === row.id}
                          className="px-1.5 text-sm text-zinc-300 hover:text-red-500"
                          aria-label="삭제"
                        >
                          {deletingId === row.id ? '...' : '×'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 dark:bg-zinc-900/60 font-medium">
                    <td className={tdClean} colSpan={2}>{group.중분류 || group.대분류} 소계</td>
                    <td className={`${tdClean} text-right`}>{groupTargetSum(group.rows, '목표건') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupTargetSum(group.rows, '목표명') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupCountSum(group.rows, '건') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupCountSum(group.rows, '명') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '월계건') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '월계명') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '누계건') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '누계명') || '-'}</td>
                    <td className={tdClean}></td>
                    <td className={tdClean}></td>
                    <td className={tdClean}></td>
                  </tr>
                </Fragment>
              );
            })}
            {rollup.length > 0 && (
              <tr className="bg-brand-tint font-semibold">
                <td className={tdClean} colSpan={2}>합계</td>
                <td className={`${tdClean} text-right`}>{grandTargetCount || '-'}</td>
                <td className={`${tdClean} text-right`}>{grandTargetPeople || '-'}</td>
                <td className={`${tdClean} text-right`}>{groupCountSum(rollup, '건') || '-'}</td>
                <td className={`${tdClean} text-right`}>{groupCountSum(rollup, '명') || '-'}</td>
                <td className={`${tdClean} text-right`}>{groupSum(rollup, '월계건') || '-'}</td>
                <td className={`${tdClean} text-right`}>{groupSum(rollup, '월계명') || '-'}</td>
                <td className={`${tdClean} text-right`}>{grandCumCount || '-'}</td>
                <td className={`${tdClean} text-right`}>{grandCumPeople || '-'}</td>
                <td className={`${tdClean} text-right`}>{rate(grandCumCount, grandTargetCount)}</td>
                <td className={`${tdClean} text-right`}>{rate(grandCumPeople, grandTargetPeople)}</td>
                <td className={tdClean}></td>
              </tr>
            )}
            <tr className="bg-zinc-50/60 dark:bg-zinc-900/30">
              <td className={tdClean} colSpan={2}>
                <span className="text-xs text-zinc-400">새 구분항목</span>
              </td>
              <td className={tdClean} colSpan={2}>
                <div className="flex gap-1.5">
                  <input
                    className={`${inputBase} w-24`}
                    placeholder="대분류"
                    value={newCategory.대분류}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, 대분류: e.target.value }))}
                  />
                  <input
                    className={`${inputBase} w-24`}
                    placeholder="중분류"
                    value={newCategory.중분류}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, 중분류: e.target.value }))}
                  />
                  <input
                    className={inputBase}
                    placeholder="세부항목 *"
                    value={newCategory.세부항목}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, 세부항목: e.target.value }))}
                  />
                </div>
              </td>
              <td className={tdClean}>
                <input
                  className={numInput}
                  placeholder="목표"
                  value={newCategory.목표건}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, 목표건: e.target.value }))}
                  inputMode="numeric"
                />
              </td>
              <td className={tdClean}>
                <input
                  className={numInput}
                  placeholder="목표"
                  value={newCategory.목표명}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, 목표명: e.target.value }))}
                  inputMode="numeric"
                />
              </td>
              <td className={tdClean} colSpan={7}>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={isAddingCategory || !newCategory.세부항목.trim()}
                  className={btnSecondary}
                >
                  {isAddingCategory ? '추가 중...' : '+ 행 추가'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">업무내용</h3>
          <button type="button" onClick={addContentRow} className={`${inputBase} !py-1 !px-2.5 text-xs`}>
            + 행 추가
          </button>
        </div>
        <div className={cardTableWrap}>
          <table className={tableClean}>
            <thead>
              <tr>
                <th className={thClean}>업무내용</th>
                <th className={thClean}></th>
              </tr>
            </thead>
            <tbody>
              {contentRows.map((row) => (
                <tr key={row.key} className={trHoverClean}>
                  <td className={tdClean}>
                    <input
                      className={inputBase}
                      value={row.content}
                      onChange={(e) => updateContentRow(row.key, e.target.value)}
                      placeholder="예: 대상자 상담 - 4명(홍길동 외)"
                    />
                  </td>
                  <td className={tdClean}>
                    <button
                      type="button"
                      onClick={() => removeContentRow(row.key)}
                      className="px-1.5 text-sm text-zinc-300 hover:text-red-500"
                      aria-label="삭제"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">특이사항</h3>
        <textarea
          className={`${inputBase} w-full`}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="특이사항을 입력하세요"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {statusText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{statusText}</span>}
        <button type="button" onClick={handleSubmit} disabled={isPending} className={btn}>
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
