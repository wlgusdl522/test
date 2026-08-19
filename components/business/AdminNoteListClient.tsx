'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnDanger, btnSecondary, table, td, th, tableWrap } from '@/lib/ui';
import { saveAdminNotesAction } from '@/app/(portal)/business-summary/boardOverviewActions';

type Row = { key: string; id?: string; 내용: string; 요약포함: boolean; 요약내용: string };
type InitialRow = { id: string; 내용: string; 요약포함: boolean; 요약내용: string };

export default function AdminNoteListClient({ ym, initialRows }: { ym: string; initialRows: InitialRow[] }) {
  const router = useRouter();
  const counterRef = useRef(0);
  const [rows, setRows] = useState<Row[]>(
    initialRows.map((r) => ({ key: r.id, id: r.id, 내용: r.내용, 요약포함: r.요약포함, 요약내용: r.요약내용 }))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  function addRow() {
    counterRef.current += 1;
    setRows((prev) => [...prev, { key: `new-${counterRef.current}`, 내용: '', 요약포함: false, 요약내용: '' }]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function update(key: string, field: '내용' | '요약내용', value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  // 요약에 포함 체크를 처음 켤 때만 원문을 요약용 문구로 그대로 복사해준다 — 이후엔 서로 독립적으로 수정.
  function toggleSummary(key: string, checked: boolean) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const 요약내용 = checked && !r.요약내용.trim() ? r.내용 : r.요약내용;
        return { ...r, 요약포함: checked, 요약내용 };
      })
    );
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = rows
          .filter((r) => r.내용.trim())
          .map((r) => ({ id: r.id, 내용: r.내용.trim(), 요약포함: r.요약포함, 요약내용: r.요약내용.trim() }));
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
              <th className={`${th} w-16 text-center`}>요약에 포함</th>
              <th className={th}>요약용 짧은 문구</th>
              <th className={`${th} w-12`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className={`${td} text-center text-zinc-400`} colSpan={5}>등록된 행정사항이 없습니다.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td className={`${td} text-center tabular-nums text-zinc-400 align-top`}>{i + 1}</td>
                <td className={`${td} align-top`}>
                  <textarea
                    value={r.내용} onChange={(e) => update(r.key, '내용', e.target.value)} rows={4}
                    placeholder={'예: 1. 신규공모사업 선정 및 신규사업 진행\n  1) 총 4건\n    가) ...'}
                    className="w-full min-w-[16rem] resize-y rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] whitespace-pre-wrap focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
                <td className={`${td} text-center align-top`}>
                  <input
                    type="checkbox" checked={r.요약포함}
                    onChange={(e) => toggleSummary(r.key, e.target.checked)}
                    className="h-4 w-4"
                  />
                </td>
                <td className={`${td} align-top`}>
                  <textarea
                    value={r.요약내용} onChange={(e) => update(r.key, '요약내용', e.target.value)} rows={2}
                    disabled={!r.요약포함}
                    placeholder="요약보고에 실을 짧은 문구"
                    className="w-full min-w-[12rem] resize-y rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none disabled:opacity-40 dark:bg-zinc-950"
                  />
                </td>
                <td className={`${td} text-center align-top`}>
                  <button type="button" onClick={() => removeRow(r.key)} className={btnDanger}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={addRow} className={btnSecondary}>+ 행 추가</button>
        <button type="button" onClick={handleSave} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
