import { card, tableWrap, table, th, td } from '@/lib/ui';

type Req = Record<string, string>;

function vehicleLabel(vehicleNo: string, vehicles: { 차량번호: string; 차종: string }[]): string {
  return vehicles.find((v) => v.차량번호 === vehicleNo)?.차종 ?? vehicleNo;
}

export default function VehicleRequestCalendar({
  month,
  selectedDate,
  requests,
  vehicles,
  hasLogByRequestId,
}: {
  month: string; // yyyy-MM
  selectedDate: string | null;
  requests: Req[];
  vehicles: { 차량번호: string; 차종: string }[];
  hasLogByRequestId: Set<string>;
}) {
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
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const selectedRequests = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <a href={`/vehicles/requests?view=calendar&month=${prevMonth}`} className="text-sm text-brand hover:underline">◀ 이전달</a>
        <span className="text-sm font-semibold">{year}년 {monthNum}월</span>
        <a href={`/vehicles/requests?view=calendar&month=${nextMonth}`} className="text-sm text-brand hover:underline">다음달 ▶</a>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekdayLabels.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-zinc-500 py-1">{w}</div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} className="min-h-20" />;
          const dayRequests = byDate.get(iso) ?? [];
          const vehiclesForDay = [...new Set(dayRequests.map((r) => r.차량번호))];
          const isSelected = iso === selectedDate;
          return (
            <a
              key={iso}
              href={`/vehicles/requests?view=calendar&month=${month}&date=${iso}`}
              className={`min-h-20 rounded-md border p-1 text-xs flex flex-col gap-0.5 hover:border-brand ${
                isSelected ? 'border-brand bg-brand-tint' : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <span className="font-semibold">{Number(iso.slice(-2))}</span>
              {vehiclesForDay.slice(0, 2).map((v) => {
                const allDone = dayRequests.filter((r) => r.차량번호 === v).every((r) => hasLogByRequestId.has(r.id));
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
            </a>
          );
        })}
      </div>

      {selectedDate && (
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{selectedDate} 예약 현황</h3>
            <a href={`/vehicles/requests?date=${selectedDate}`} className="text-sm text-brand hover:underline">+ 예약</a>
          </div>
          {selectedRequests.length === 0 ? (
            <p className="text-sm text-zinc-400">이 날짜에 등록된 예약이 없습니다.</p>
          ) : (
            <div className={tableWrap}><table className={table}>
              <thead>
                <tr><th className={th}>차량</th><th className={th}>신청자</th><th className={th}>목적</th><th className={th}>목적지</th><th className={th}>상태</th></tr>
              </thead>
              <tbody>
                {selectedRequests.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{vehicleLabel(r.차량번호, vehicles)}</td>
                    <td className={td}>{r.신청자명}</td>
                    <td className={td}>{r.목적}</td>
                    <td className={td}>{r.목적지}</td>
                    <td className={td}>{hasLogByRequestId.has(r.id) ? '운행완료' : '예약됨'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}
