'use client';

type Req = Record<string, string>;

function vehicleLabel(vehicleNo: string, vehicles: { 차량번호: string; 차종: string }[]): string {
  return vehicles.find((v) => v.차량번호 === vehicleNo)?.차종 ?? vehicleNo;
}

export default function VehicleRequestCalendar({
  date,
  requests,
  vehicles,
  hasLogRequestIds,
  onSelectDate,
  onNavigate,
  onOpenNew,
}: {
  date: string; // yyyy-MM-dd, 달력의 기준(선택된) 날짜
  requests: Req[];
  vehicles: { 차량번호: string; 차종: string }[];
  hasLogRequestIds: Set<string>;
  onSelectDate: (iso: string) => void;
  onNavigate: (iso: string) => void;
  onOpenNew: (iso: string) => void;
}) {
  const month = date.slice(0, 7);
  const [year, monthNum] = month.split('-').map(Number);
  const firstOfMonth = new Date(year, monthNum - 1, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=일
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const byDate = new Map<string, Req[]>();
  for (const r of requests) {
    if (!r.사용일자.startsWith(month)) continue;
    if (!byDate.has(r.사용일자)) byDate.set(r.사용일자, []);
    byDate.get(r.사용일자)!.push(r);
  }

  const prevMonthDate = new Date(year, monthNum - 2, 1);
  const nextMonthDate = new Date(year, monthNum, 1);
  const prevMonthIso = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const nextMonthIso = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

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
        <button type="button" onClick={() => onNavigate(nextMonthIso)} className="text-sm text-brand hover:underline">다음달 ▶</button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-4 sm:gap-1">
        {weekdayLabels.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-zinc-500 py-1">{w}</div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} className="min-h-14 sm:min-h-20" />;
          const dayRequests = byDate.get(iso) ?? [];
          const vehiclesForDay = [...new Set(dayRequests.map((r) => r.차량번호))];
          const isSelected = iso === date;
          return (
            <button
              type="button"
              key={iso}
              onClick={() => onSelectDate(iso)}
              onDoubleClick={() => onOpenNew(iso)}
              title="더블클릭하면 이 날짜로 바로 예약할 수 있어요"
              className={`min-h-14 rounded-md border p-0.5 text-xs flex flex-col gap-0.5 items-stretch text-left hover:border-brand sm:min-h-20 sm:p-1 ${
                isSelected ? 'border-brand bg-brand-tint' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              <span className="font-semibold">{Number(iso.slice(-2))}</span>

              {/* 모바일: 칸이 좁아 차종 이름이 잘려 안 보이므로 색상 점으로만 표시 */}
              {vehiclesForDay.length > 0 && (
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {vehiclesForDay.slice(0, 4).map((v) => {
                    const allDone = dayRequests.filter((r) => r.차량번호 === v).every((r) => hasLogRequestIds.has(r.id));
                    return (
                      <span
                        key={v}
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${allDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      />
                    );
                  })}
                  {vehiclesForDay.length > 4 && <span className="text-[9px] leading-none text-zinc-400">+{vehiclesForDay.length - 4}</span>}
                </div>
              )}

              <div className="hidden sm:flex sm:flex-col sm:gap-0.5">
                {vehiclesForDay.slice(0, 2).map((v) => {
                  const allDone = dayRequests.filter((r) => r.차량번호 === v).every((r) => hasLogRequestIds.has(r.id));
                  return (
                    <span
                      key={v}
                      className={`truncate rounded px-1 ${allDone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'}`}
                    >
                      {vehicleLabel(v, vehicles)}
                    </span>
                  );
                })}
                {vehiclesForDay.length > 2 && <span className="text-zinc-400">+{vehiclesForDay.length - 2}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
