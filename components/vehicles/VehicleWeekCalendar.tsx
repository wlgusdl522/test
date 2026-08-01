import { badgeBase, badgeTone } from '@/lib/ui';

type Req = Record<string, string>;

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function vehicleLabel(vehicleNo: string, vehicles: { 차량번호: string; 차종: string }[]): string {
  return vehicles.find((v) => v.차량번호 === vehicleNo)?.차종 ?? vehicleNo;
}

export default function VehicleWeekCalendar({
  date,
  requests,
  vehicles,
  hasLogByRequestId,
}: {
  date: string;
  requests: Req[];
  vehicles: { 차량번호: string; 차종: string }[];
  hasLogByRequestId: Set<string>;
}) {
  const weekStart = mondayOf(date);
  const start = new Date(`${weekStart}T00:00:00`);
  const dayDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dayDates.push(d.toISOString().slice(0, 10));
  }
  const prevWeek = new Date(start); prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(start); nextWeek.setDate(nextWeek.getDate() + 7);
  const prevWeekIso = prevWeek.toISOString().slice(0, 10);
  const nextWeekIso = nextWeek.toISOString().slice(0, 10);

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
        <a href={`/vehicles?view=week&date=${prevWeekIso}`} className="text-sm text-brand hover:underline">◀ 이전주</a>
        <span className="text-sm font-semibold">{firstMD} ~ {lastMD}</span>
        <a href={`/vehicles?view=week&date=${nextWeekIso}`} className="text-sm text-brand hover:underline">다음주 ▶</a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {dayDates.map((iso, i) => {
          const dayRequests = byDate.get(iso) ?? [];
          const isToday = iso === new Date().toISOString().slice(0, 10);
          return (
            <div key={iso} className={`rounded-md border p-2 min-h-32 ${isToday ? 'border-brand' : 'border-zinc-200 dark:border-zinc-800'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-semibold ${isToday ? 'text-brand' : 'text-zinc-600 dark:text-zinc-300'}`}>
                  {WEEKDAY_LABELS[i]} {Number(iso.slice(8, 10))}
                </span>
                <a href={`/vehicles?view=week&date=${iso}&new=1`} className="text-xs text-brand hover:underline">+ 예약</a>
              </div>
              <div className="flex flex-col gap-1">
                {dayRequests.length === 0 ? (
                  <span className="text-xs text-zinc-300 dark:text-zinc-700">-</span>
                ) : dayRequests.map((r) => (
                  <div key={r.id} className="text-xs">
                    <span className={`${badgeBase} ${hasLogByRequestId.has(r.id) ? badgeTone.green : badgeTone.blue} mb-0.5`}>
                      {vehicleLabel(r.차량번호, vehicles)}
                    </span>
                    <div className="text-zinc-600 dark:text-zinc-400 truncate">{r.신청자명} · {r.목적}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
