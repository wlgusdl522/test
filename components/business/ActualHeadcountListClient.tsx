'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnDanger, btnSecondary, table, td, th, tableWrap } from '@/lib/ui';
import { saveHeadcountRowsAction } from '@/app/(portal)/business-summary/boardHeadcountActions';

type Row = { key: string; id?: string; 사업구분: string; 실인원: string; 비고: string };

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

export default function ActualHeadcountListClient({
  ym, initialRows,
}: {
  ym: string;
  initialRows: { id: string; 사업구분: string; 실인원: number; 비고: string }[];
}) {
  const router = useRouter();
  const counterRef = useRef(0);
  const [rows, setRows] = useState<Row[]>(
    initialRows.map((r) => ({ key: r.id, id: r.id, 사업구분: r.사업구분, 실인원: r.실인원 ? String(r.실인원) : '', 비고: r.비고 }))
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  const 합계 = rows.reduce((a, r) => a + (Number(r.실인원) || 0), 0);

  function update(key: string, field: '사업구분' | '실인원' | '비고', value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    counterRef.current += 1;
    setRows((prev) => [...prev, { key: `new-${counterRef.current}`, 사업구분: '', 실인원: '', 비고: '' }]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function handleSave() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const payload = rows
          .filter((r) => r.사업구분.trim())
          .map((r) => ({ id: r.id, 사업구분: r.사업구분.trim(), 실인원: Number(r.실인원) || 0, 비고: r.비고.trim() }));
        await saveHeadcountRowsAction(ym, payload);
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
              <th className={th}>사업 구분</th>
              <th className={`${th} w-24 text-right`}>실인원(명)</th>
              <th className={th}>비고</th>
              <th className={`${th} w-12`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className={`${td} text-center text-zinc-400`} colSpan={4}>등록된 내용이 없습니다.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.key}>
                <td className={td}>
                  <input
                    value={r.사업구분} onChange={(e) => update(r.key, '사업구분', e.target.value)}
                    placeholder="예: 상담/노년사회화교육/건강지원/도서실"
                    className="w-full rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
                <td className={td}>
                  <input
                    type="number" min="0" value={r.실인원} onChange={(e) => update(r.key, '실인원', e.target.value)}
                    placeholder="0" className="w-full rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-right font-mono focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
                <td className={td}>
                  <input
                    value={r.비고} onChange={(e) => update(r.key, '비고', e.target.value)}
                    className="w-full rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13.5px] focus:border-brand focus:outline-none dark:bg-zinc-950"
                  />
                </td>
                <td className={`${td} text-center`}>
                  <button type="button" onClick={() => removeRow(r.key)} className={btnDanger}>삭제</button>
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                <td className={td}>합 계</td>
                <td className={`${td} text-right font-mono`}>{nf(합계)}</td>
                <td className={td} colSpan={2} />
              </tr>
            )}
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
