import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import PrintButton from '@/components/print/PrintButton';
import CopyPlanTableButton from '@/components/business/CopyPlanTableButton';
import { getAgendaRounds, getMinutes, getNextRound } from '@/lib/mutate/laborCouncil';
import { formatMeetingDateTime } from '@/lib/mutate/staffMeeting';
import { btnSecondary, card } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 한글(HWP)에 붙여넣었을 때 웹 화면처럼 보이지 않도록, 다른 인쇄물(print/business-plan)에서
// 이미 검증된 것과 같은 오피스 문서 스타일(검은 테두리·회색 헤더)을 그대로 쓴다.
const lbl = {
  border: '1px solid #000', background: '#f2f2f2', fontWeight: 700 as const,
  textAlign: 'center' as const, padding: '4px 6px', fontSize: 11, verticalAlign: 'top' as const,
};
const cell = { border: '1px solid #000', padding: '4px 6px', fontSize: 11, verticalAlign: 'top' as const };
const cellC = { ...cell, textAlign: 'center' as const };

export default async function LaborCouncilMinutesPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  if (!(await hasPageAccess('labor-council'))) return <PageAccessDenied />;

  const rounds = await getAgendaRounds();
  const { round: roundParam } = await searchParams;
  const 회차 = roundParam || rounds[0] || (await getNextRound());
  const minutes = await getMinutes(회차);

  const 근로자위원 = minutes.참석자.filter((a) => a.구분 === '근로자위원' && a.참석);
  const 사용자위원 = minutes.참석자.filter((a) => a.구분 === '사용자위원' && a.참석);
  const attendeeRows = Math.max(근로자위원.length, 사용자위원.length, 1);

  return (
    <div>
      <div className={`${card} flex items-center gap-3 print:hidden`}>
        <PrintButton />
        <CopyPlanTableButton targetId="minutes-table" className={btnSecondary} />
      </div>

      <div style={{ width: '210mm', margin: '0 auto', color: '#000' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>제 {회차}차 노사협의회 회의록</div>
        </div>

        <table id="minutes-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <colgroup><col style={{ width: '30mm' }} /><col /></colgroup>
          <tbody>
            <tr>
              <td style={lbl}>회의일시</td>
              <td style={cell}>{minutes.회의일시 ? formatMeetingDateTime(minutes.회의일시) : '-'}</td>
            </tr>
            <tr>
              <td style={lbl}>회의장소</td>
              <td style={cell}>{minutes.회의장소 || '-'}</td>
            </tr>
            <tr>
              <td style={lbl}>협의사항</td>
              <td style={cell}>
                {minutes.협의의결.length === 0
                  ? '-'
                  : minutes.협의의결.map((r, i) => <div key={i}>{i + 1}. {r.안건제목 || '(제목 없음)'}</div>)}
              </td>
            </tr>
            <tr>
              <td style={lbl}>의결사항</td>
              <td style={cell}>
                {minutes.협의의결.length === 0
                  ? '-'
                  : minutes.협의의결.map((r, i) => (
                      <div key={i} style={{ marginBottom: i < minutes.협의의결.length - 1 ? 10 : 0 }}>
                        <b>{i + 1}. {r.안건제목 || '(제목 없음)'}</b>
                        <div style={{ marginTop: 4 }}>가. 의결내용 : {r.의결내용 || '-'}</div>
                        <div style={{ marginTop: 4 }}>(가) 근로자 : {r.근로자의견 || '-'}</div>
                        <div style={{ marginTop: 4 }}>(나) 사용자 : {r.사용자의견 || '-'}</div>
                      </div>
                    ))}
              </td>
            </tr>
            <tr>
              <td style={lbl}>보고사항</td>
              <td style={cell}>{minutes.보고사항 || '-'}</td>
            </tr>
            <tr>
              <td style={lbl}>의결된 사항 및<br />그 이행에 관한 사항</td>
              <td style={cell}>{minutes.의결된사항 || '-'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><td colSpan={4} style={lbl}>참 석 자 명 단</td></tr>
              <tr>
                <td colSpan={2} style={lbl}>근 로 자 위 원</td>
                <td colSpan={2} style={lbl}>사 용 자 위 원</td>
              </tr>
              <tr>
                <td style={lbl}>성 명</td><td style={lbl}>서 명</td>
                <td style={lbl}>성 명</td><td style={lbl}>서 명</td>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: attendeeRows }).map((_, i) => (
                <tr key={i}>
                  <td style={cellC}>{근로자위원[i]?.성명 ?? ''}</td>
                  <td style={cell}></td>
                  <td style={cellC}>{사용자위원[i]?.성명 ?? ''}</td>
                  <td style={cell}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
