import { table, tableWrap, td, th } from '@/lib/ui';
import { addDays } from '@/lib/dutyDate';
import { driveThumbUrl } from '@/lib/drive/thumbUrl';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDutyDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEKDAY_KO[d.getDay()]})`;
}

const cell: React.CSSProperties = { textAlign: 'center', verticalAlign: 'middle' };
const cellNowrap: React.CSSProperties = { ...cell, whiteSpace: 'nowrap' };

function StatusCheck({ value, reason }: { value: string; reason?: string }) {
  const ok = !value || value === '이상없음';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-zinc-600 text-[10px] leading-none dark:border-zinc-400">
          {ok ? '✓' : ''}
        </span>
        이상없음
      </span>
      {!ok && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{value}</span>}
      {reason && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">({reason})</span>}
    </div>
  );
}

function SignatureCell({ url }: { url?: string }) {
  const thumb = url ? driveThumbUrl(url, 160) : '';
  if (!thumb) return <span className="text-zinc-300 dark:text-zinc-700">-</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={thumb} alt="서명" className="mx-auto h-8 w-auto object-contain" />;
}

// 인쇄 페이지(app/print/duty-log-weekly)와 /duty 화면의 "일지" 탭이 같은 표를 그대로 공유한다.
// 실제 배정/작성 여부와 상관없이 월~토 6일치 행을 항상 보여준다(공휴일/미배포 날짜는 사유를 표시).
// 기존 구글시트 인쇄 양식(제목/결재란/체크박스/서명)의 느낌을 최대한 살렸다.
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
            <th className={th} style={cell} rowSpan={2}>일자</th>
            <th className={th} style={cell} rowSpan={2}>당직자</th>
            <th className={th} style={cell} colSpan={3}>시설점검현황</th>
            <th className={th} style={cell} colSpan={2}>민원처리현황</th>
            <th className={th} style={cell} rowSpan={2}>응급 및<br />비상시 특이사항</th>
            <th className={th} style={cell} rowSpan={2}>퇴근전<br />특근자</th>
            <th className={th} style={cell} rowSpan={2}>최종<br />인계자</th>
            <th className={th} style={cell} rowSpan={2}>서명</th>
          </tr>
          <tr>
            <th className={th} style={cell}>실별소등확인</th>
            <th className={th} style={cell}>창문닫기</th>
            <th className={th} style={cell}>출입문잠금</th>
            <th className={th} style={cell}>전화/민원</th>
            <th className={th} style={cell}>내방객 및<br />내방이유</th>
          </tr>
        </thead>
        <tbody>
          {weekdayDates.map((date) => {
            const r = weekdayLogs.find((row) => row.근무일자 === date);
            const holidayName = holidayByDate.get(date);
            if (!r) {
              return (
                <tr key={date}>
                  <td className={td} style={cellNowrap}>{formatDutyDayLabel(date)}</td>
                  <td className={td} style={cell} colSpan={9}>
                    {holidayName ? `공휴일(${holidayName})` : '배정 없음'}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={date}>
                <td className={td} style={cellNowrap}>{formatDutyDayLabel(date)}</td>
                <td className={td} style={cell}>
                  {r.이름}
                  <br />
                  <span style={{ color: '#888', fontSize: 11 }}>{r.소속}</span>
                </td>
                <td className={td} style={cell}><StatusCheck value={r.실별소등확인} reason={r.사유} /></td>
                <td className={td} style={cell}><StatusCheck value={r.창문닫기} reason={r.사유2} /></td>
                <td className={td} style={cell}><StatusCheck value={r.출입문잠금} reason={r.사유3} /></td>
                <td className={td} style={cell}>{r.전화민원내용 || '-'}</td>
                <td className={td} style={cell}>{r.내방객및내방이유 || '-'}</td>
                <td className={td} style={cell}>{r.응급및비상시특이사항 || '-'}</td>
                <td className={td} style={cell}>{r.퇴근전특근자성명 || '-'}</td>
                <td className={td} style={cell}>{r.최종인계자 || '-'}</td>
                <td className={td} style={cell}><SignatureCell url={r.사인} /></td>
              </tr>
            );
          })}
          <tr>
            <td className={td} style={cellNowrap}>{formatDutyDayLabel(saturdayDate)}</td>
            {saturdayRow ? (
              <>
                <td className={td} style={cell}>
                  {saturdayRow.이름1}
                  <br />
                  <span style={{ color: '#888', fontSize: 11 }}>{saturdayRow.소속1}</span>
                </td>
                <td className={td} style={cell} colSpan={7}>토요당직 (시설점검 없음)</td>
                <td className={td} style={cell}><SignatureCell url={saturdayRow.사인1} /></td>
              </>
            ) : (
              <td className={td} style={cell} colSpan={9}>
                {holidayByDate.has(saturdayDate) ? `공휴일(${holidayByDate.get(saturdayDate)})` : '배정 없음'}
              </td>
            )}
          </tr>
          {saturdayRow && (
            <tr>
              <td className={td} style={cellNowrap} />
              <td className={td} style={cell}>
                {saturdayRow.이름2}
                <br />
                <span style={{ color: '#888', fontSize: 11 }}>{saturdayRow.소속2}</span>
              </td>
              <td className={td} style={cell} colSpan={7} />
              <td className={td} style={cell}><SignatureCell url={saturdayRow.사인2} /></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
