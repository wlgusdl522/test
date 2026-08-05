'use client';

import { Fragment, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, cardTableWrap, inputBase, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { saveGeneralLogDayAction } from '@/app/(portal)/general-work-log/actions';
import type { GeneralLogRollupRow, GeneralLogContentRow } from '@/lib/mutate/generalLog';

type ContentRow = { key: string; content: string; perf: string; note: string };
type Counts = Record<string, { 건: string; 명: string }>;

function toContentRows(rows: GeneralLogContentRow[]): ContentRow[] {
  if (rows.length === 0) return [{ key: crypto.randomUUID(), content: '', perf: '', note: '' }];
  return rows.map((r) => ({ key: r.id, content: r.업무내용, perf: r.실적, note: r.비고 }));
}

const numInput = `${inputBase} w-16 text-right px-1.5`;

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
  const [contentRows, setContentRows] = useState<ContentRow[]>(() => toContentRows(initialContent));
  const [note, setNote] = useState(initialNote);
  const [statusText, setStatusText] = useState('');
  const [isPending, startTransition] = useTransition();

  function setCount(itemId: string, field: '건' | '명', value: string) {
    setCounts((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  }

  function addContentRow() {
    setContentRows((prev) => [...prev, { key: crypto.randomUUID(), content: '', perf: '', note: '' }]);
  }

  function removeContentRow(key: string) {
    setContentRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateContentRow(key: string, field: 'content' | 'perf' | 'note', value: string) {
    setContentRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function handleSubmit() {
    const dailyEntries = rollup.map((r) => ({
      항목ID: r.id,
      건: counts[r.id]?.건 ?? '',
      명: counts[r.id]?.명 ?? '',
    }));
    const rowsToSave = contentRows
      .filter((r) => r.content.trim())
      .map((r) => ({ 업무내용: r.content, 실적: r.perf, 비고: r.note }));

    setStatusText('저장 중...');
    startTransition(async () => {
      try {
        await saveGeneralLogDayAction(business, date, dailyEntries, rowsToSave, note);
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
  function groupCountSum(rows: GeneralLogRollupRow[], field: '건' | '명'): number {
    return rows.reduce((acc, r) => acc + Number(counts[r.id]?.[field] || 0), 0);
  }

  const grandTargetCount = groupSum(rollup, '목표건');
  const grandTargetPeople = groupSum(rollup, '목표명');
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
            </tr>
          </thead>
          <tbody>
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
                      <td className={`${tdClean} text-right`}>{row.목표건 || '-'}</td>
                      <td className={`${tdClean} text-right`}>{row.목표명 || '-'}</td>
                      <td className={tdClean}>
                        <input
                          className={numInput}
                          value={counts[row.id]?.건 ?? ''}
                          onChange={(e) => setCount(row.id, '건', e.target.value)}
                          inputMode="numeric"
                        />
                      </td>
                      <td className={tdClean}>
                        <input
                          className={numInput}
                          value={counts[row.id]?.명 ?? ''}
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
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 dark:bg-zinc-900/60 font-medium">
                    <td className={tdClean} colSpan={2}>{group.중분류 || group.대분류} 소계</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '목표건') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '목표명') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupCountSum(group.rows, '건') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupCountSum(group.rows, '명') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '월계건') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '월계명') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '누계건') || '-'}</td>
                    <td className={`${tdClean} text-right`}>{groupSum(group.rows, '누계명') || '-'}</td>
                    <td className={tdClean}></td>
                    <td className={tdClean}></td>
                  </tr>
                </Fragment>
              );
            })}
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
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">업무내용 / 실적</h3>
          <button type="button" onClick={addContentRow} className={`${inputBase} !py-1 !px-2.5 text-xs`}>
            + 행 추가
          </button>
        </div>
        <div className={cardTableWrap}>
          <table className={tableClean}>
            <thead>
              <tr>
                <th className={thClean}>업무내용</th>
                <th className={thClean}>실적</th>
                <th className={thClean}>비고</th>
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
                      onChange={(e) => updateContentRow(row.key, 'content', e.target.value)}
                      placeholder="업무내용"
                    />
                  </td>
                  <td className={tdClean}>
                    <input
                      className={`${inputBase} w-32`}
                      value={row.perf}
                      onChange={(e) => updateContentRow(row.key, 'perf', e.target.value)}
                      placeholder="예: 2명"
                    />
                  </td>
                  <td className={tdClean}>
                    <input
                      className={inputBase}
                      value={row.note}
                      onChange={(e) => updateContentRow(row.key, 'note', e.target.value)}
                      placeholder="비고"
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

function rate(actual: number, target: number): number {
  return target > 0 ? Math.round((actual / target) * 1000) / 10 : 0;
}
