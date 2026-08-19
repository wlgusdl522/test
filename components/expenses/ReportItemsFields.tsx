'use client';

import { useState } from 'react';
import { btnSecondary } from '@/lib/ui';
import TrashIcon from '@/components/icons/TrashIcon';

export type ReportItemRow = {
  품목명: string;
  규격: string;
  단위: string;
  수량: string;
  단가: string;
  금액: string;
};

function emptyRow(): ReportItemRow {
  return { 품목명: '', 규격: '', 단위: '', 수량: '', 단가: '', 금액: '' };
}

const cellInput =
  'w-full border-0 bg-transparent px-1.5 py-1 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand rounded';

export default function ReportItemsFields({ defaultItems }: { defaultItems: ReportItemRow[] }) {
  const [items, setItems] = useState<ReportItemRow[]>(defaultItems.length > 0 ? defaultItems : [emptyRow()]);

  function updateItem(idx: number, key: keyof ReportItemRow, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }
  function addRow() {
    setItems((prev) => [...prev, emptyRow()]);
  }
  function removeRow(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  const total = items.reduce((sum, it) => sum + (Number(String(it.금액).replace(/,/g, '')) || 0), 0);

  return (
    <div className="col-span-2 flex flex-col gap-2">
      {/* 서버 액션은 이 필드 하나만 읽어서 payload['품목목록JSON']으로 그대로 넘긴다 */}
      <input type="hidden" name="품목목록JSON" value={JSON.stringify(items)} readOnly />
      <div className="text-[12.5px] text-zinc-500 dark:text-zinc-400">검수 품목 *</div>
      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50">
              <th className="text-left px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400">품목명</th>
              <th className="text-left px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400 w-24">규격</th>
              <th className="text-left px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400 w-16">단위</th>
              <th className="text-left px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400 w-14">수량</th>
              <th className="text-left px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400 w-24">단가</th>
              <th className="text-left px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400 w-24">금액</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="p-1">
                  <input value={it.품목명} onChange={(e) => updateItem(idx, '품목명', e.target.value)} className={cellInput} />
                </td>
                <td className="p-1">
                  <input value={it.규격} onChange={(e) => updateItem(idx, '규격', e.target.value)} className={cellInput} />
                </td>
                <td className="p-1">
                  <input value={it.단위} onChange={(e) => updateItem(idx, '단위', e.target.value)} className={cellInput} />
                </td>
                <td className="p-1">
                  <input value={it.수량} onChange={(e) => updateItem(idx, '수량', e.target.value)} className={cellInput} />
                </td>
                <td className="p-1">
                  <input value={it.단가} onChange={(e) => updateItem(idx, '단가', e.target.value)} className={cellInput} />
                </td>
                <td className="p-1">
                  <input value={it.금액} onChange={(e) => updateItem(idx, '금액', e.target.value)} className={cellInput} />
                </td>
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="inline-flex items-center justify-center rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-[#b51c31] dark:hover:bg-red-950/40"
                    aria-label="품목 삭제"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td colSpan={5} className="px-2 py-1.5 text-right text-zinc-500 dark:text-zinc-400">합계</td>
              <td colSpan={2} className="px-2 py-1.5 font-semibold text-zinc-800 dark:text-zinc-100">{total.toLocaleString()}원</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" onClick={addRow} className={`${btnSecondary} self-start`}>+ 품목 추가</button>
    </div>
  );
}
