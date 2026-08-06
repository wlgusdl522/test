import { table, tableWrap, td, th } from '@/lib/ui';
import { addDays } from '@/lib/dutyDate';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDutyDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEKDAY_KO[d.getDay()]})`;
}

const cellLbl: React.CSSProperties = { textAlign: 'center', whiteSpace: 'nowrap' };

// 인쇄 페이지(app/print/duty-log-weekly)와 /duty 화면의 "일지" 탭이 같은 표를 그대로 공유한다.
// 실제 배정/작성 여부와 상관없이 월~토 6일치 행을 항상 보여준다(공휴일/미배포 날짜는 사유를 표시).
export default function DutyWeeklyLogTable({
  monday,
  weekdayLogs,
  saturdayLogs,
  holidays = [],
}: {
  monday: string;
  weekdayLogs: Record<string, string>[];
  saturdayLogs: Record<string, string>[];
  holidays?: { 날짜: string; 휴일명: string }[];
}) {
  const holidayByDate = new Map(holidays.map((h) => [h.날짜, h.휴일명]));
  const weekdayDates = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
  const saturdayDate = addDays(monday, 5);
  const saturdayRow = saturdayLogs.find((r) => r.근무일자 === saturdayDate);

  return (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr>
            <th className={th} style={cellLbl}>일자</th>
            <th className={th} style={cellLbl}>당직자</th>
            <th className={th} style={cellLbl}>실별소등확인</th>
            <th className={th} style={cellLbl}>창문닫기</th>
            <th className={th} style={cellLbl}>출입문잠금</th>
            <th className={th}>전화/민원</th>
            <th className={th}>내방객 및 내방이유</th>
            <th className={th}>응급 및 비상시 특이사항</th>
            <th className={th} style={cellLbl}>퇴근전 특근자</th>
            <th className={th} style={cellLbl}>최종인계자</th>
          </tr>
        </thead>
        <tbody>
          {weekdayDates.map((date) => {
            const r = weekdayLogs.find((row) => row.근무일자 === date);
            const holidayName = holidayByDate.get(date);
            if (!r) {
              return (
                <tr key={date}>
                  <td className={td} style={cellLbl}>{formatDutyDayLabel(date)}</td>
                  <td className={td} style={cellLbl} colSpan={9}>
                    {holidayName ? `공휴일(${holidayName})` : '배정 없음'}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={date}>
                <td className={td} style={cellLbl}>{formatDutyDayLabel(date)}</td>
                <td className={td} style={cellLbl}>
                  {r.이름}
                  <br />
                  <span style={{ color: '#888', fontSize: 11 }}>{r.소속}</span>
                </td>
                <td className={td} style={cellLbl}>{r.실별소등확인 || '-'}{r.사유 && ` (${r.사유})`}</td>
                <td className={td} style={cellLbl}>{r.창문닫기 || '-'}{r.사유2 && ` (${r.사유2})`}</td>
                <td className={td} style={cellLbl}>{r.출입문잠금 || '-'}{r.사유3 && ` (${r.사유3})`}</td>
                <td className={td}>{r.전화민원내용 || '-'}</td>
                <td className={td}>{r.내방객및내방이유 || '-'}</td>
                <td className={td}>{r.응급및비상시특이사항 || '-'}</td>
                <td className={td} style={cellLbl}>{r.퇴근전특근자성명 || '-'}</td>
                <td className={td} style={cellLbl}>{r.최종인계자 || '-'}</td>
              </tr>
            );
          })}
          <tr>
            <td className={td} style={cellLbl}>{formatDutyDayLabel(saturdayDate)}</td>
            <td className={td} style={cellLbl} colSpan={9}>
              {saturdayRow
                ? `(토요당직) ${saturdayRow.이름1}(${saturdayRow.소속1}), ${saturdayRow.이름2}(${saturdayRow.소속2})`
                : holidayByDate.has(saturdayDate)
                  ? `공휴일(${holidayByDate.get(saturdayDate)})`
                  : '배정 없음'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
