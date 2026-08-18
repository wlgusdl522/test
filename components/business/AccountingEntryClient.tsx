'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { submitAccountingValuesAction } from '@/app/(portal)/business-summary/boardAccountingActions';
import { isCarryForwardItem } from '@/lib/mutate/accountingConstants';

type Item = { id: string; 그룹: string; 항목명: string };
type RenderRow = { groupLabel: string | null; rowSpan: number; itemLabel: string; itemId: string | null };

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

function buildRows(items: Item[]): RenderRow[] {
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    if (!groups.has(it.그룹)) groups.set(it.그룹, []);
    groups.get(it.그룹)!.push(it);
  }
  const rows: RenderRow[] = [];
  for (const [그룹, groupItems] of groups) {
    if (groupItems.length === 1) {
      rows.push({ groupLabel: 그룹, rowSpan: 1, itemLabel: '', itemId: groupItems[0].id });
    } else {
      rows.push({ groupLabel: 그룹, rowSpan: groupItems.length + 1, itemLabel: '계', itemId: null });
      groupItems.forEach((it) => rows.push({ groupLabel: null, rowSpan: 0, itemLabel: it.항목명, itemId: it.id }));
    }
  }
  return rows;
}

function Section({
  title, items, values, onChange,
}: {
  title: string; items: Item[]; values: Record<string, string>; onChange: (id: string, v: string) => void;
}) {
  const rows = buildRows(items);
  const groupSum = (그룹: string) =>
    items.filter((i) => i.그룹 === 그룹).reduce((a, i) => a + (Number(values[i.id]) || 0), 0);

  return (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr>
            <th className={`${th} text-center`} colSpan={2}>{title}</th>
            <th className={`${th} text-right`}>금액(원)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className={`${td} text-center text-zinc-400`} colSpan={3}>등록된 항목이 없습니다.</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              {r.groupLabel !== null && (
                <td className={`${td} whitespace-nowrap font-semibold`} rowSpan={r.rowSpan}>{r.groupLabel}</td>
              )}
              <td className={`${td} whitespace-nowrap ${r.itemLabel === '계' ? 'font-semibold' : ''}`}>{r.itemLabel}</td>
              {r.itemId ? (
                <td className={td}>
                  <input
                    type="number" min="0" placeholder="0"
                    value={values[r.itemId] ?? ''}
                    onChange={(e) => onChange(r.itemId as string, e.target.value)}
                    className="w-32 rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
              ) : (
                <td className={`${td} text-right font-mono font-semibold tabular-nums`}>
                  {nf(groupSum(r.groupLabel as string))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AccountingEntryClient({
  시설, ym, income, expense, initialValues, suggestedCarryForward,
}: {
  시설: string;
  ym: string;
  income: Item[];
  expense: Item[];
  initialValues: Record<string, number>;
  suggestedCarryForward: number | null;
}) {
  const router = useRouter();
  const allItems = [...income, ...expense];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const it of allItems) {
      const stored = initialValues[it.id];
      if (stored) init[it.id] = String(stored);
      else if (isCarryForwardItem(it.항목명) && suggestedCarryForward !== null) init[it.id] = String(suggestedCarryForward);
      else init[it.id] = '';
    }
    return init;
  });
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function update(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  const carryItem = income.find((i) => isCarryForwardItem(i.항목명));
  const 전월이월 = carryItem ? Number(values[carryItem.id]) || 0 : 0;
  const 수입계 = income.filter((i) => i.id !== carryItem?.id).reduce((a, i) => a + (Number(values[i.id]) || 0), 0);
  const 지출계 = expense.reduce((a, i) => a + (Number(values[i.id]) || 0), 0);
  const 차월이월 = 전월이월 + 수입계 - 지출계;
  const 합계 = 전월이월 + 수입계; // 지출 쪽 합계(지출계+차월이월)와 항상 같아야 정상

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const entries = allItems.map((i) => ({ 항목ID: i.id, 값: Number(values[i.id]) || 0 }));
        await submitAccountingValuesAction(시설, ym, entries);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <Section title="수 입" items={income} values={values} onChange={update} />
          <div className={`${tableWrap} -mt-3`}>
            <table className={table}>
              <tbody>
                <tr>
                  <td className={`${td} font-semibold`} colSpan={2}>수입계</td>
                  <td className={`${td} text-right font-mono font-semibold tabular-nums`}>{nf(수입계)}</td>
                </tr>
                <tr>
                  <td className={`${td} font-semibold`} colSpan={2}>합계</td>
                  <td className={`${td} text-right font-mono font-semibold tabular-nums`}>{nf(합계)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <Section title="지 출" items={expense} values={values} onChange={update} />
          <div className={`${tableWrap} -mt-3`}>
            <table className={table}>
              <tbody>
                <tr>
                  <td className={`${td} font-semibold`} colSpan={2}>지출계</td>
                  <td className={`${td} text-right font-mono font-semibold tabular-nums`}>{nf(지출계)}</td>
                </tr>
                <tr>
                  <td className={`${td} font-semibold`} colSpan={2}>차월이월</td>
                  <td className={`${td} text-right font-mono font-semibold tabular-nums`}>{nf(차월이월)}</td>
                </tr>
                <tr>
                  <td className={`${td} font-semibold`} colSpan={2}>합계</td>
                  <td className={`${td} text-right font-mono font-semibold tabular-nums`}>{nf(합계)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
