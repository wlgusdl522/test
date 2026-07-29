import { getKeyedList } from '@/lib/mutate/keyedTable';
import { VEHICLE_LIST_TABLE } from '@/lib/sheets/registry';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import {
  addVehicleRequestAction,
  deleteVehicleRequestAction,
  deleteVehicleRequestSeriesAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  { value: 0, label: '일' }, { value: 1, label: '월' }, { value: 2, label: '화' },
  { value: 3, label: '수' }, { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' },
];

export default async function VehicleRequestsPage() {
  const [requests, vehicles] = await Promise.all([
    getVehicleRequestList(),
    getKeyedList(VEHICLE_LIST_TABLE),
  ]);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>차량사용신청</h1>

      <form action={addVehicleRequestAction} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '16px 0', border: '1px solid #ddd', padding: 16 }}>
        <label>
          차량 *
          <select name="vehicleNo" required style={{ width: '100%', padding: 6 }}>
            {vehicles.map((v) => <option key={v.차량번호} value={v.차량번호}>{v.차종} ({v.차량번호})</option>)}
          </select>
        </label>
        <label>
          사용일자 *
          <input type="date" name="date" required style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          출발시간
          <input type="time" name="startTime" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          복귀시간
          <input type="time" name="endTime" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          목적 *
          <input name="purpose" required style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          목적지
          <input name="destination" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          동승자
          <input name="companions" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          비고
          <input name="note" style={{ width: '100%', padding: 6 }} />
        </label>

        <div style={{ gridColumn: '1 / -1', border: '1px dashed #ccc', padding: 8 }}>
          <label><input type="checkbox" name="recurring" /> 반복 일정으로 등록</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {WEEKDAYS.map((w) => (
              <label key={w.value} style={{ fontSize: 13 }}>
                <input type="checkbox" name="weekday" value={w.value} /> {w.label}
              </label>
            ))}
            <label style={{ fontSize: 13 }}>
              반복 종료일 <input type="date" name="untilDate" style={{ padding: 4 }} />
            </label>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit">신청</button>
        </div>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>사용일자</th><th>차량</th><th>신청자</th><th>시간</th><th>목적</th><th>목적지</th><th></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.사용일자}</td>
              <td>{r.차량번호}</td>
              <td>{r.신청자명}</td>
              <td>{r.출발시간} ~ {r.복귀시간}</td>
              <td>{r.목적}</td>
              <td>{r.목적지}</td>
              <td>
                <form action={deleteVehicleRequestAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit">{r.반복그룹ID ? '삭제(이 건만)' : '삭제'}</button>
                </form>
                {r.반복그룹ID && (
                  <form action={deleteVehicleRequestSeriesAction} style={{ display: 'inline', marginLeft: 4 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" title="이 날짜 이후 반복 전체 삭제">삭제(이후 전체)</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
