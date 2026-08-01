'use client';

import { badgeBase, badgeTone } from '@/lib/ui';

type Req = Record<string, string>;

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 브라우저의 로컬 타임존(KST)에서 new Date(...).toISOString()을 쓰면 UTC로 변환되면서
// 날짜가 하루 밀리는 문제가 있어, 로컬 연/월/일 getter로만 문자열을 만든다.
function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalIso(d);
}

function vehicleLabel(vehicleNo: string, vehicles: { 차량번호: string; 차종: string }[]): string {
  return vehicles.find((v) => v.차량번호 === vehicleNo)?.차종 ?? vehicleNo;
}

export default function VehicleWeekCalendar({
  date,
  selectedDate,
  requests,
  vehicles,
  hasLogRequestIds,
  onSelectDate,
  onNavigate,
}: {
  date: string;
  selectedDate: string | null;
  requests: Req[];
  vehicles: { 차량번호: string; 차종: string }[];
  hasLogRequestIds: Set<string>;
  onSelectDate: (iso: string) => void;
  onNavigate: (iso: string) => void;
}) {
  const weekStart = mondayOf(date);
  const start = new Date(`${weekStart}T00:00:00`);
  const dayDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dayDates.push(toLocalIso(d));
  }
  const prevWeek = new Date(start); prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(start); nextWeek.setDate(nextWeek.getDate() + 7);
  const prevWeekIso = toLocalIso(prevWeek);
  const nextWeekIso = toLocalIso(nextWeek);

  const byDate = new Map<string, Req[]>();
  for (const r of requests) {
    if (!byDate.has(r.사용일자)) byDate.set(r.사용일자, []);
    byDate.get(r.사용일자)!.push(r);
  }

  const last = dayDates[6];
  const firstMD = `${Number(dayDates[0].slice(5, 7))}/${Number(dayDates[0].slice(8, 10))}`;
  const lastMD = `${Number(last.slice(5, 7))}/${Number(last.slice(8, 10))}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => onNavigate(prevWeekIso)} className="text-sm text-brand hover:underline">◀ 이전주</button>
        <span className="text-sm font-semibold">{firstMD} ~ {lastMD}</span>
        <button type="button" onClick={() => onNavigate(nextWeekIso)} className="text-sm text-brand hover:underline">다음주 ▶</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {dayDates.map((iso, i) => {
          const dayRequests = byDate.get(iso) ?? [];
          const isToday = iso === toLocalIso(new Date());
          const isSelected = iso === selectedDate;
          return (
            <button
              type="button"
              key={iso}
              onClick={() => onSelectDate(iso)}
              className={`text-left rounded-md border p-2 min-h-32 hover:border-brand ${
                isSelected ? 'border-brand bg-brand-tint' : isToday ? 'border-brand' : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <span className={`text-xs font-semibold ${isToday ? 'text-brand' : 'text-zinc-600 dark:text-zinc-300'}`}>
                {WEEKDAY_LABELS[i]} {Number(iso.slice(8, 10))}
              </span>
              <div className="mt-1.5 flex flex-col gap-1">
                {dayRequests.length === 0 ? (
                  <span className="text-xs text-zinc-300 dark:text-zinc-700">-</span>
                ) : dayRequests.map((r) => (
                  <div key={r.id} className="text-xs">
                    <span className={`${badgeBase} ${hasLogRequestIds.has(r.id) ? badgeTone.green : badgeTone.blue} mb-0.5`}>
                      {vehicleLabel(r.차량번호, vehicles)}
                    </span>
                    <div className="text-zinc-600 dark:text-zinc-400 truncate">{r.신청자명} · {r.출발시간 || '-'}~{r.복귀시간 || '-'}</div>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
