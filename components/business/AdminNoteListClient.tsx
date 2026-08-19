'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnDanger, btnSecondary, table, td, th, tableWrap } from '@/lib/ui';
import { saveAdminNotesAction } from '@/app/(portal)/business-summary/boardOverviewActions';

type Row = { key: string; id?: string; 내용: string };

export default function AdminNoteListClient({ ym, initialRows }: { ym: string; initialRows: { id: string; 내용: string }[] }) {
  const router = useRouter();
  const counterRef = useRef(0);
  const [rows, setRows] = useState<Row[]>(initialRows.map((r) => ({ key: r.id, id: r.id, 내용: r.내용 })));
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function addRow() {
    counterRef.current += 1;
    setRows((prev) => [...prev, { key: `new-${counterRef.current}`, 내용: '' }]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function update(key: string, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, 내용: value } : r)));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = rows.filter((r) => r.내용.trim()).map((r) => ({ id: r.id, 내용: r.내용.trim() }));
        await saveAdminNotesAction(ym, payload);
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
              <th className={`${th} w-10 text-center`}>#</th>
              <th className={th}>내용</th>
              <th className={`${th} w-12`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className={`${td} text-center text-zinc-400`} colSpan={3}>등록된 행정사항이 없습니다.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td className={`${td} text-center tabular-nums text-zinc-400`}>{i + 1}</td>
                <td className={td}>
                  <input
                    value={r.내용} onChange={(e) => update(r.key, e.target.value)}
                    placeholder="예: 신규공모사업 선정 및 신규사업 진행: 총 4건"
                    className="w-full rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
                <td className={`${td} text-center`}>
                  <button type="button" onClick={() => removeRow(r.key)} className={btnDanger}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={addRow} className={btnSecondary}>+ 행 추가</button>
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
