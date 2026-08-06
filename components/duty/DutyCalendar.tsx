'use client';

import { formatSwapChain } from '@/lib/dutySwapChain';

export type DutyDay =
  | { kind: 'weekday'; row: Record<string, string> }
  | { kind: 'saturday'; row: Record<string, string> };

export default function DutyCalendar({
  date,
  logsByDate,
  holidaysByDate,
  onSelectDate,
  onOpenSwap,
  onNavigate,
}: {
  date: string; // yyyy-MM-dd, 달력의 기준(선택된) 날짜
  logsByDate: Map<string, DutyDay>;
  holidaysByDate: Map<string, string>;
  onSelectDate: (iso: string) => void;
  onOpenSwap: (iso: string) => void;
  onNavigate: (iso: string) => void;
}) {
  const month = date.slice(0, 7);
  const [year, monthNum] = month.split('-').map(Number);
  const firstOfMonth = new Date(year, monthNum - 1, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=일
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const prevMonthDate = new Date(year, monthNum - 2, 1);
  const nextMonthDate = new Date(year, monthNum, 1);
  const prevMonthIso = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonthIso = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

  // 배정을 너무 멀리 미리 볼 수 없게, 이번달+1(다음달)까지만 앞으로 넘길 수 있게 막는다.
  const now = new Date();
  const maxMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const maxMonth = `${maxMonthDate.getFullYear()}-${String(maxMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const atMaxMonth = month >= maxMonth;

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => onNavigate(prevMonthIso)} className="text-sm text-brand hover:underline">◀ 이전달</button>
        <span className="text-sm font-semibold">{year}년 {monthNum}월</span>
        <button
          type="button"
          onClick={() => onNavigate(nextMonthIso)}
          disabled={atMaxMonth}
          title={atMaxMonth ? '다음달까지만 미리 볼 수 있습니다' : undefined}
          className="text-sm text-brand hover:underline disabled:text-zinc-300 disabled:no-underline dark:disabled:text-zinc-700"
        >
          다음달 ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdayLabels.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-zinc-500 py-1">{w}</div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} className="min-h-20" />;
          const day = logsByDate.get(iso);
          const holidayName = holidaysByDate.get(iso);
          const isSunday = new Date(`${iso}T00:00:00`).getDay() === 0;
          const isSelected = iso === date;
          return (
            <button
              type="button"
              key={iso}
              onClick={() => onSelectDate(iso)}
              onDoubleClick={() => onOpenSwap(iso)}
              title="한 번 클릭: 현황 보기/작성 · 더블클릭: 교체하기"
              className={`min-h-20 rounded-md border p-1 text-xs flex flex-col gap-0.5 items-stretch text-left hover:border-brand ${
                isSelected ? 'border-brand bg-brand-tint' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              <span className="font-semibold">{Number(iso.slice(-2))}</span>
              {holidayName && (
                <span className="truncate rounded bg-rose-100 px-1 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                  {holidayName}
                </span>
              )}
              {!holidayName && isSunday && <span className="truncate px-1 text-zinc-400">일요일</span>}
              {day?.kind === 'weekday' && (
                <span
                  className={`truncate rounded px-1 ${day.row.사인 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'}`}
                  title={formatSwapChain(day.row.원배정성명, day.row.이름 || '-')}
                >
                  {formatSwapChain(day.row.원배정성명, day.row.이름 || '-')}
                </span>
              )}
              {day?.kind === 'saturday' && (
                <>
                  <span
                    className={`truncate rounded px-1 ${day.row.사인1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'}`}
                    title={formatSwapChain(day.row.원배정성명1, day.row.이름1 || '-')}
                  >
                    {formatSwapChain(day.row.원배정성명1, day.row.이름1 || '-')}
                  </span>
                  <span
                    className={`truncate rounded px-1 ${day.row.사인2 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'}`}
                    title={formatSwapChain(day.row.원배정성명2, day.row.이름2 || '-')}
                  >
                    {formatSwapChain(day.row.원배정성명2, day.row.이름2 || '-')}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
