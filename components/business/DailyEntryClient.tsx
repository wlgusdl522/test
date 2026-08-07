'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { badgeBase, badgeTone, btn, btnSecondary, table, td, th, tableWrap } from '@/lib/ui';
import { submitDailyEntriesAction } from '@/app/(portal)/business/daily/actions';

type Row = {
  id: string; 세부사업명: string; 중분류: string; 소분류: string;
  목표건: number; 목표명: number; day: [number, number]; mtd: [number, number]; ytd: [number, number];
};

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');
const fpct = (v: number | null) => (v === null ? '–' : v >= 100 ? v.toFixed(0) : v.toFixed(1));
const pct = (v: number, g: number) => (g > 0 ? (v / g) * 100 : null);

function PctCell({ value, goal }: { value: number; goal: number }) {
  const p = pct(value, goal);
  if (p === null) return <span className="text-xs text-zinc-400">–</span>;
  const tone = p >= 100 ? badgeTone.green : p >= 50 ? badgeTone.amber : badgeTone.gray;
  return <span className={`${badgeBase} ${tone}`}>{fpct(p)}%</span>;
}

function subSpan(rows: Row[], i: number): number {
  if (i > 0 && rows[i - 1].세부사업명 === rows[i].세부사업명) return 0;
  let n = 1;
  while (rows[i + n] && rows[i + n].세부사업명 === rows[i].세부사업명) n++;
  return n;
}

function midSpan(rows: Row[], i: number): number {
  const same = (a: Row, b: Row) => a.세부사업명 === b.세부사업명 && a.중분류 === b.중분류;
  if (i > 0 && same(rows[i - 1], rows[i])) return 0;
  let n = 1;
  while (rows[i + n] && same(rows[i + n], rows[i])) n++;
  return n;
}

export default function DailyEntryClient({
  business, date, prevDate, nextDate, rows, grandGoal,
  totalDay, totalMtd, totalYtd, initialContent, initialNote, dow, settingsToggle,
}: {
  business: string; date: string; prevDate: string; nextDate: string;
  rows: Row[]; grandGoal: number;
  totalDay: [number, number]; totalMtd: [number, number]; totalYtd: [number, number];
  initialContent: string; initialNote: string; dow: string; settingsToggle?: React.ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, { gc: string; gp: string }>>(
    () => Object.fromEntries(rows.map((r) => [r.id, { gc: r.day[0] ? String(r.day[0]) : '', gp: r.day[1] ? String(r.day[1]) : '' }]))
  );
  const [content, setContent] = useState(initialContent);
  const [note, setNote] = useState(initialNote);
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      if (!map.has(r.세부사업명)) map.set(r.세부사업명, []);
      map.get(r.세부사업명)!.push(r);
    });
    return map;
  }, [rows]);

  function setVal(id: string, field: 'gc' | 'gp', v: string) {
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: v } }));
  }

  function handleSubmit() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const entries = rows.map((r) => ({
          id: r.id, gc: Number(values[r.id]?.gc) || 0, gp: Number(values[r.id]?.gp) || 0,
        }));
        await submitDailyEntriesAction(business, date, entries, content, note);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-sm font-semibold">{date} ({dow})</span>
        <a href={`?business=${encodeURIComponent(business)}&date=${prevDate}`} className={btnSecondary}>◀ 전일</a>
        <a href={`?business=${encodeURIComponent(business)}&date=${nextDate}`} className={btnSecondary}>다음일 ▶</a>
        <button type="button" onClick={handleSubmit} disabled={isPending} className={btn}>저장</button>
        {status && <span className="text-xs text-zinc-500 dark:text-zinc-400">{status}</span>}
        <div className="ml-auto">{settingsToggle}</div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">당일 일계</div>
          <div className="font-mono text-lg font-bold">{nf(totalDay[0])}건 / {nf(totalDay[1])}명</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">{Number(date.slice(5, 7))}월 월계</div>
          <div className="font-mono text-lg font-bold">{nf(totalMtd[0])}건 / {nf(totalMtd[1])}명</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">연 누계</div>
          <div className="font-mono text-lg font-bold text-brand">{nf(totalYtd[0])}건 / {nf(totalYtd[1])}명</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">총계 달성율</div>
          <div className="font-mono text-lg font-bold text-brand"><PctCell value={totalYtd[1]} goal={grandGoal} /></div>
        </div>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th} rowSpan={2}>세부사업</th>
              <th className={th} colSpan={2}>구분</th>
              <th className={th} colSpan={2}>목표</th>
              <th className={th} colSpan={2} style={{ background: '#e4eef0' }}>일계(입력)</th>
              <th className={th} colSpan={2}>월계</th><th className={th} colSpan={2}>누계</th>
              <th className={th} rowSpan={2}>달성율</th>
            </tr>
            <tr>
              <th className={th}>중분류</th><th className={th}>소분류</th>
              <th className={th}>건</th><th className={th}>명</th>
              <th className={th} style={{ background: '#e4eef0' }}>건</th><th className={th} style={{ background: '#e4eef0' }}>명</th>
              <th className={th}>건</th><th className={th}>명</th><th className={th}>건</th><th className={th}>명</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const span = subSpan(rows, i);
              const mspan = midSpan(rows, i);
              return (
                <tr key={r.id}>
                  {span > 0 && <td className={`${td} font-medium`} rowSpan={span}>{r.세부사업명}</td>}
                  {mspan > 0 && <td className={`${td} text-left align-middle`} rowSpan={mspan}>{r.중분류}</td>}
                  <td className={`${td} text-left`}>{r.소분류 || '–'}</td>
                  <td className={`${td} text-zinc-400`}>{nf(r.목표건)}</td>
                  <td className={`${td} text-zinc-400`}>{nf(r.목표명)}</td>
                  <td className={td}>
                    <input
                      type="number" min="0" placeholder="0"
                      value={values[r.id]?.gc ?? ''}
                      onChange={(e) => setVal(r.id, 'gc', e.target.value)}
                      className="w-16 rounded border border-transparent bg-[#fcfbf8] px-1 py-1 text-center font-mono focus:border-brand focus:outline-none dark:bg-zinc-950"
                    />
                  </td>
                  <td className={td}>
                    <input
                      type="number" min="0" placeholder="0"
                      value={values[r.id]?.gp ?? ''}
                      onChange={(e) => setVal(r.id, 'gp', e.target.value)}
                      className="w-16 rounded border border-transparent bg-[#fcfbf8] px-1 py-1 text-center font-mono focus:border-brand focus:outline-none dark:bg-zinc-950"
                    />
                  </td>
                  <td className={td}>{nf(r.mtd[0])}</td><td className={td}>{nf(r.mtd[1])}</td>
                  <td className={`${td} font-semibold`}>{nf(r.ytd[0])}</td><td className={`${td} font-semibold`}>{nf(r.ytd[1])}</td>
                  <td className={td}><PctCell value={r.ytd[1] || r.ytd[0]} goal={r.목표명 || r.목표건} /></td>
                </tr>
              );
            })}
            {[...groups.entries()].map(([name, groupRows]) => {
              const sum = (key: 'day' | 'mtd' | 'ytd', idx: 0 | 1) => groupRows.reduce((a, r) => a + r[key][idx], 0);
              const gGoalP = groupRows.reduce((a, r) => a + r.목표명, 0);
              return (
                <tr key={`sub-${name}`} className="bg-[#eef1f5] font-semibold dark:bg-zinc-800">
                  <td className={td} colSpan={3}>소계 · {name}</td>
                  <td className={td}>{nf(groupRows.reduce((a, r) => a + r.목표건, 0))}</td>
                  <td className={td}>{nf(gGoalP)}</td>
                  <td className={td}>{nf(sum('day', 0))}</td><td className={td}>{nf(sum('day', 1))}</td>
                  <td className={td}>{nf(sum('mtd', 0))}</td><td className={td}>{nf(sum('mtd', 1))}</td>
                  <td className={td}>{nf(sum('ytd', 0))}</td><td className={td}>{nf(sum('ytd', 1))}</td>
                  <td className={td}><PctCell value={sum('ytd', 1)} goal={gGoalP} /></td>
                </tr>
              );
            })}
            <tr className="bg-brand-dark font-semibold text-white">
              <td className={`${td} !text-white`} colSpan={5}>총 계</td>
              <td className={`${td} !text-white`}>{nf(totalDay[0])}</td><td className={`${td} !text-white`}>{nf(totalDay[1])}</td>
              <td className={`${td} !text-white`}>{nf(totalMtd[0])}</td><td className={`${td} !text-white`}>{nf(totalMtd[1])}</td>
              <td className={`${td} !text-white`}>{nf(totalYtd[0])}</td><td className={`${td} !text-white`}>{nf(totalYtd[1])}</td>
              <td className={`${td} !text-white`}>{fpct(pct(totalYtd[1], grandGoal))}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs font-semibold">활동내용</div>
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="* 항목명 - N명(성명 또는 내용)"
            className="min-h-[88px] w-full rounded-md border border-zinc-300 bg-[#fcfbf8] px-3 py-2.5 text-sm leading-relaxed focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <div className="mb-1.5 text-xs font-semibold">특이사항</div>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="휴관, 사고, 인수인계 등"
            className="min-h-[88px] w-full rounded-md border border-zinc-300 bg-[#fcfbf8] px-3 py-2.5 text-sm leading-relaxed focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
      </div>
    </div>
  );
}
