import { table, tableWrap, td, th } from '@/lib/ui';

type Req = Record<string, string>;

function vehicleLabel(vehicleNo: string, vehicles: { 차량번호: string; 차종: string }[]): string {
  return vehicles.find((v) => v.차량번호 === vehicleNo)?.차종 ?? vehicleNo;
}

function formatDayTitle(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`;
}

export default function VehicleDayCalendar({
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
  const prev = new Date(`${date}T00:00:00`); prev.setDate(prev.getDate() - 1);
  const next = new Date(`${date}T00:00:00`); next.setDate(next.getDate() + 1);
  const prevIso = prev.toISOString().slice(0, 10);
  const nextIso = next.toISOString().slice(0, 10);
  const dayRequests = requests.filter((r) => r.사용일자 === date);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <a href={`/vehicles?view=day&date=${prevIso}`} className="text-sm text-brand hover:underline">◀ 전날</a>
        <span className="text-sm font-semibold">{formatDayTitle(date)}</span>
        <a href={`/vehicles?view=day&date=${nextIso}`} className="text-sm text-brand hover:underline">다음날 ▶</a>
      </div>

      <div className="flex items-center justify-end mb-2">
        <a href={`/vehicles?view=day&date=${date}&new=1`} className="text-sm text-brand hover:underline">+ 예약</a>
      </div>

      {dayRequests.length === 0 ? (
        <p className="text-sm text-zinc-400 py-4">이 날짜에 등록된 예약이 없습니다.</p>
      ) : (
        <div className={tableWrap}><table className={table}>
          <thead>
            <tr>
              <th className={th}>차량</th><th className={th}>신청자</th><th className={th}>시간</th>
              <th className={th}>목적</th><th className={th}>목적지</th><th className={th}>상태</th>
            </tr>
          </thead>
          <tbody>
            {dayRequests.map((r) => (
              <tr key={r.id}>
                <td className={td}>{vehicleLabel(r.차량번호, vehicles)}</td>
                <td className={td}>{r.신청자명}</td>
                <td className={td}>{r.출발시간} ~ {r.복귀시간}</td>
                <td className={td}>{r.목적}</td>
                <td className={td}>{r.목적지}</td>
                <td className={td}>{hasLogByRequestId.has(r.id) ? '운행완료' : '예약됨'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
