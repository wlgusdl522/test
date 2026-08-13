'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnDanger, btnSecondary, table, td, th, tableWrap } from '@/lib/ui';
import { saveBoardReportSectionAction } from '@/app/(portal)/business-summary/boardPlanActions';
import type { BoardPlanEntry, BoardReportType } from '@/lib/mutate/boardPlan';

type Row = { key: string; id?: string; 사업명: string; 실시월일: string; 내용: string; 성과: string };

const cellInput =
  'w-full min-w-[7rem] resize-y rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] leading-relaxed focus:border-brand focus:outline-none dark:bg-zinc-950';

export default function BoardReportTableClient({
  구분,
  ym,
  columnLabel,
  initialRows,
  examples,
}: {
  구분: BoardReportType;
  ym: string;
  columnLabel: string;
  initialRows: BoardPlanEntry[];
  examples: { 사업명: string; 실시월일: string; 내용: string; 성과: string };
}) {
  const router = useRouter();
  const counterRef = useRef(0);
  const [rows, setRows] = useState<Row[]>(
    initialRows.map((r) => ({ key: r.id, id: r.id, 사업명: r.사업명, 실시월일: r.실시월일, 내용: r.내용, 성과: r.성과 }))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function update(key: string, field: keyof Omit<Row, 'key' | 'id'>, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    counterRef.current += 1;
    setRows((prev) => [...prev, { key: `new-${counterRef.current}`, 사업명: '', 실시월일: '', 내용: '', 성과: '' }]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = rows
          .filter((r) => r.사업명.trim() || r.실시월일.trim() || r.내용.trim() || r.성과.trim())
          .map((r) => ({ id: r.id, 사업명: r.사업명, 실시월일: r.실시월일, 내용: r.내용, 성과: r.성과 }));
        await saveBoardReportSectionAction(구분, ym, payload);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <div>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} w-40`}>사업명</th>
              <th className={`${th} w-28`}>실시월일</th>
              <th className={th}>내용</th>
              <th className={th}>{columnLabel}</th>
              <th className={`${th} w-12`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className={`${td} text-center text-zinc-400`} colSpan={5}>등록된 내용이 없습니다. 아래 &quot;행 추가&quot;로 시작하세요.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.key}>
                <td className={`${td} align-top`}>
                  <input
                    value={r.사업명} onChange={(e) => update(r.key, '사업명', e.target.value)}
                    placeholder={examples.사업명} className={cellInput}
                  />
                </td>
                <td className={`${td} align-top`}>
                  <input
                    value={r.실시월일} onChange={(e) => update(r.key, '실시월일', e.target.value)}
                    placeholder={examples.실시월일} className={cellInput}
                  />
                </td>
                <td className={`${td} align-top`}>
                  <textarea
                    value={r.내용} onChange={(e) => update(r.key, '내용', e.target.value)}
                    placeholder={examples.내용} rows={3} className={cellInput}
                  />
                </td>
                <td className={`${td} align-top`}>
                  <textarea
                    value={r.성과} onChange={(e) => update(r.key, '성과', e.target.value)}
                    placeholder={examples.성과} rows={3} className={cellInput}
                  />
                </td>
                <td className={`${td} align-top text-center`}>
                  <button type="button" onClick={() => removeRow(r.key)} className={btnDanger}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={addRow} className={btnSecondary}>+ 행 추가</button>
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
