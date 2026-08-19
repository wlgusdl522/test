import { Fragment } from 'react';
import type { FullBoardReportData } from '@/lib/mutate/boardFullReport';
import { sectionTitle, subTitle, reportTable as table, th, td, tdC, tdR, totalRow } from '@/components/business/full/reportStyles';

// 이사회자료 "전체 통" 화면/인쇄에서 쓰는 컴포넌트. hwpx 변환 경로는 Next.js가 라우트 핸들러에서
// react-dom/server 직접 import를 막아서 이 JSX를 그대로 재사용하지 못하고, 같은 스타일 정의
// (reportStyles.ts)만 공유하는 별도 문자열 빌더(renderFullReportHtml.ts)를 쓴다.
// 한글(HWP)에 붙여넣거나 hwpx로 변환했을 때 웹 화면처럼 보이지 않도록, 기존 print/business-plan
// 페이지에서 이미 쓰던 것과 같은 오피스 문서 스타일(검은 테두리·회색 헤더 인라인 스타일)을 그대로 쓴다.

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

function Empty({ colSpan, text = '등록된 내용이 없습니다.' }: { colSpan: number; text?: string }) {
  return <tr><td style={{ ...tdC, color: '#888' }} colSpan={colSpan}>{text}</td></tr>;
}

function HighlightTable({ title, rows }: { title: string; rows: { 사업명: string; 실시월일: string; 내용: string; 성과: string }[] }) {
  return (
    <>
      <div style={subTitle}>{title}</div>
      <table style={table}>
        <colgroup><col style={{ width: '18%' }} /><col style={{ width: '12%' }} /><col /><col style={{ width: '25%' }} /></colgroup>
        <thead><tr><th style={th}>사업명</th><th style={th}>실시월일</th><th style={th}>내용</th><th style={th}>성과/기대효과</th></tr></thead>
        <tbody>
          {rows.length === 0 && <Empty colSpan={4} text="체크된 항목이 없습니다." />}
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={td}>{r.사업명}</td><td style={tdC}>{r.실시월일}</td>
              <td style={{ ...td, whiteSpace: 'pre-wrap' }}>{r.내용}</td>
              <td style={{ ...td, whiteSpace: 'pre-wrap' }}>{r.성과}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function FacilityStatTable({ rows, extraTotal }: { rows: { 시설명: string; 전월누계: number; 금월실적: number; 누계?: number }[]; extraTotal?: boolean }) {
  const 합전 = rows.reduce((a, r) => a + r.전월누계, 0);
  const 합금 = rows.reduce((a, r) => a + r.금월실적, 0);
  const 합누 = rows.reduce((a, r) => a + (r.누계 ?? r.전월누계 + r.금월실적), 0);
  return (
    <table style={table}>
      <thead><tr><th style={th}>시설명</th><th style={th}>전월누계</th><th style={th}>금월실적</th><th style={th}>누계</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.시설명}>
            <td style={td}>{r.시설명}</td><td style={tdR}>{nf(r.전월누계)}</td><td style={tdR}>{nf(r.금월실적)}</td>
            <td style={tdR}>{nf(r.누계 ?? r.전월누계 + r.금월실적)}</td>
          </tr>
        ))}
        {extraTotal !== false && (
          <tr style={totalRow}><td style={td}>합 계</td><td style={tdR}>{nf(합전)}</td><td style={tdR}>{nf(합금)}</td><td style={tdR}>{nf(합누)}</td></tr>
        )}
      </tbody>
    </table>
  );
}

export default function FullReportBody({ data }: { data: FullBoardReportData }) {
  const { ym, summary, report, performance, headcount, volunteers, accounting, donation, adminNotes } = data;

  return (
    <div style={{ width: '210mm', margin: '0 auto', color: '#000', fontFamily: '"Malgun Gothic", sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>서대문노인종합복지관 이사회 자료</div>
        <div style={{ fontSize: 12, marginTop: 4, color: '#555' }}>{ym}</div>
      </div>

      {/* 1) 요약 업무보고 */}
      <div style={sectionTitle}>1. 요약 업무보고</div>
      <HighlightTable title="1) 사업보고" rows={summary.사업보고하이라이트} />
      <HighlightTable title="2) 사업계획" rows={summary.사업계획하이라이트} />
      <div style={subTitle}>3) 서비스 제공 인원 현황</div>
      <FacilityStatTable rows={summary.serviceRows} />
      <div style={subTitle}>4) 자원봉사자 현황 요약</div>
      <FacilityStatTable rows={summary.volunteerRows} />
      <div style={subTitle}>5) 수입지출현황</div>
      <table style={table}>
        <thead><tr><th style={th}>시설명</th><th style={th}>전월잔액</th><th style={th}>금월수입</th><th style={th}>금월지출</th><th style={th}>잔액</th></tr></thead>
        <tbody>
          {summary.accountingSummaryRows.map((r) => (
            <tr key={r.시설명}>
              <td style={td}>{r.시설명}</td><td style={tdR}>{nf(r.전월잔액)}</td><td style={tdR}>{nf(r.금월수입)}</td>
              <td style={tdR}>{nf(r.금월지출)}</td><td style={tdR}>{nf(r.잔액)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={subTitle}>6) 예금잔액총액: {nf(summary.예금잔액총액)}원</div>
      <div style={subTitle}>7-1) 후원금</div>
      <FacilityStatTable rows={summary.cashSummaryRows} />
      <div style={subTitle}>7-2) 후원물품(환가액)</div>
      <FacilityStatTable rows={summary.goodsSummaryRows} />
      <div style={subTitle}>8) 행정사항</div>
      {summary.adminNoteSummaries.length === 0 ? (
        <p style={{ fontSize: 11, color: '#888' }}>등록된 행정사항이 없습니다.</p>
      ) : (
        <ol style={{ fontSize: 11, paddingLeft: 18, whiteSpace: 'pre-wrap' }}>
          {summary.adminNoteSummaries.map((n) => <li key={n.id} style={{ marginBottom: 4 }}>{n.내용}</li>)}
        </ol>
      )}

      {/* 2) 업무보고 상세 */}
      <div style={sectionTitle}>2. 업무보고</div>
      {([['1) 사업보고', report.사업보고, report.사업보고기간, '성과'], ['2) 사업계획', report.사업계획, report.사업계획기간, '기대효과']] as const).map(
        ([title, entries, period, col]) => (
          <Fragment key={title}>
            <div style={subTitle}>{title}{period ? ` (${period})` : ''}</div>
            <table style={table}>
              <colgroup><col style={{ width: '18%' }} /><col style={{ width: '12%' }} /><col /><col style={{ width: '22%' }} /></colgroup>
              <thead><tr><th style={th}>사업명</th><th style={th}>실시월일</th><th style={th}>내용</th><th style={th}>{col}</th></tr></thead>
              <tbody>
                {entries.length === 0 && <Empty colSpan={4} />}
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td style={td}>{e.사업명}</td><td style={tdC}>{e.실시월일}</td>
                    <td style={{ ...td, whiteSpace: 'pre-wrap' }}>{e.내용}</td>
                    <td style={{ ...td, whiteSpace: 'pre-wrap' }}>{e.성과}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Fragment>
        )
      )}

      {/* 3) 사업실적 */}
      <div style={sectionTitle}>3. 전체사업 실적집계</div>
      <table style={table}>
        <colgroup>
          <col style={{ width: '14%' }} /><col style={{ width: '16%' }} />
          <col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={th} rowSpan={2}>사업</th><th style={th} rowSpan={2}>세부사업</th>
            <th style={th} colSpan={2}>연간목표</th><th style={th} colSpan={2}>전월누계</th>
            <th style={th} colSpan={2}>금월실적</th><th style={th} colSpan={2}>누계</th>
          </tr>
          <tr>
            <th style={th}>건</th><th style={th}>명</th><th style={th}>건</th><th style={th}>명</th>
            <th style={th}>건</th><th style={th}>명</th><th style={th}>건</th><th style={th}>명</th>
          </tr>
        </thead>
        <tbody>
          {performance.businesses.map((b) => (
            <Fragment key={b.business}>
              {b.subRows.length === 0 ? (
                <tr><td style={td}>{b.business}</td><td style={{ ...td, color: '#888' }} colSpan={9}>등록된 계획 없음</td></tr>
              ) : (
                b.subRows.map((r, i) => (
                  <tr key={r.세부사업명}>
                    {i === 0 && <td style={{ ...td, fontWeight: 700 }} rowSpan={b.subRows.length}>{b.business}</td>}
                    <td style={td}>{r.세부사업명}</td>
                    <td style={tdR}>{nf(r.목표건)}</td><td style={tdR}>{nf(r.목표명)}</td>
                    <td style={tdR}>{nf(r.전월누계건)}</td><td style={tdR}>{nf(r.전월누계명)}</td>
                    <td style={tdR}>{nf(r.금월실적건)}</td><td style={tdR}>{nf(r.금월실적명)}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{nf(r.누계건)}</td><td style={{ ...tdR, fontWeight: 700 }}>{nf(r.누계명)}</td>
                  </tr>
                ))
              )}
              <tr style={totalRow}>
                <td style={td} colSpan={2}>소계 · {b.business}</td>
                <td style={tdR}>{nf(b.goalC)}</td><td style={tdR}>{nf(b.goalP)}</td>
                <td style={tdR}>{nf(b.prevC)}</td><td style={tdR}>{nf(b.prevP)}</td>
                <td style={tdR}>{nf(b.curC)}</td><td style={tdR}>{nf(b.curP)}</td>
                <td style={tdR}>{nf(b.cumC)}</td><td style={tdR}>{nf(b.cumP)}</td>
              </tr>
            </Fragment>
          ))}
          <tr style={{ ...totalRow, background: '#ddd' }}>
            <td style={td} colSpan={2}>총 계</td>
            <td style={tdR}>{nf(performance.grandGoalC)}</td><td style={tdR}>{nf(performance.grandGoalP)}</td>
            <td style={tdR}>{nf(performance.grandPrevC)}</td><td style={tdR}>{nf(performance.grandPrevP)}</td>
            <td style={tdR}>{nf(performance.grandCurC)}</td><td style={tdR}>{nf(performance.grandCurP)}</td>
            <td style={tdR}>{nf(performance.grandCumC)}</td><td style={tdR}>{nf(performance.grandCumP)}</td>
          </tr>
        </tbody>
      </table>

      {/* 4) 실인원 */}
      <div style={sectionTitle}>4. 실인원 산출내역{headcount.headcountDate ? ` (${headcount.headcountDate} 기준)` : ''}</div>
      <table style={table}>
        <colgroup><col /><col style={{ width: '15%' }} /><col style={{ width: '30%' }} /></colgroup>
        <thead><tr><th style={th}>사업 구분</th><th style={th}>실인원(명)</th><th style={th}>비고</th></tr></thead>
        <tbody>
          {headcount.rows.length === 0 && <Empty colSpan={3} />}
          {headcount.rows.map((r) => (
            <tr key={r.id}><td style={td}>{r.항목명}</td><td style={tdR}>{nf(r.실인원)}</td><td style={td}>{r.비고}</td></tr>
          ))}
          {headcount.rows.length > 0 && <tr style={totalRow}><td style={td}>합 계</td><td style={tdR}>{nf(headcount.합계)}</td><td style={td} /></tr>}
        </tbody>
      </table>

      {/* 5) 자원봉사자 */}
      <div style={sectionTitle}>5. 자원봉사자 현황</div>
      <div style={subTitle}>1) 총괄</div>
      <FacilityStatTable
        rows={volunteers.rows.map((r) => ({ 시설명: r.항목명, 전월누계: 0, 금월실적: r.소계 }))}
        extraTotal={false}
      />
      <div style={subTitle}>2) 분야별 명단</div>
      <table style={table}>
        <colgroup><col style={{ width: '20%' }} /><col style={{ width: '8%' }} /><col /><col /></colgroup>
        <thead><tr><th style={th}>봉사분야</th><th style={th}>인원수</th><th style={th}>단체 명단</th><th style={th}>일반 명단</th></tr></thead>
        <tbody>
          {volunteers.rows.filter((r) => r.소계 > 0).length === 0 && <Empty colSpan={4} text="등록된 명단이 없습니다." />}
          {volunteers.rows.filter((r) => r.소계 > 0).map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.항목명}</td><td style={tdR}>{r.소계}</td>
              <td style={td}>{r.단체이름.join(' ')}</td><td style={td}>{r.일반이름.join(' ')}</td>
            </tr>
          ))}
          <tr style={totalRow}>
            <td style={td}>합 계</td><td style={tdR}>{nf(volunteers.grand소계)}</td>
            <td style={tdR}>{nf(volunteers.grand단체)}</td><td style={tdR}>{nf(volunteers.grand일반)}</td>
          </tr>
        </tbody>
      </table>

      {/* 6) 회계 */}
      <div style={sectionTitle}>6. 회계</div>
      {accounting.facilities.map((fa, fi) => (
        <div key={fa.시설}>
          <div style={subTitle}>{fi + 1}) {fa.시설명}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, margin: '4px 0' }}>수입지출 명세</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {([['수 입', fa.income], ['지 출', fa.expense]] as const).map(([label, items]) => {
              const groups = new Map<string, typeof items>();
              items.forEach((it) => {
                if (!groups.has(it.그룹)) groups.set(it.그룹, []);
                groups.get(it.그룹)!.push(it);
              });
              return (
                <table key={label} style={{ ...table, flex: 1 }}>
                  <thead><tr><th style={th} colSpan={2}>{label}</th><th style={th}>금액(원)</th></tr></thead>
                  <tbody>
                    {items.length === 0 && <Empty colSpan={3} />}
                    {[...groups.entries()].map(([그룹, groupItems]) => {
                      const groupSum = groupItems.reduce((a, it) => a + (fa.values.find((v) => v.항목ID === it.id && v.시설 === fa.시설 && v.년월 === ym)?.값 ?? 0), 0);
                      if (groupItems.length === 1) {
                        return (
                          <tr key={그룹}><td style={{ ...td, fontWeight: 700 }} colSpan={2}>{그룹}</td><td style={tdR}>{nf(groupSum)}</td></tr>
                        );
                      }
                      return (
                        <Fragment key={그룹}>
                          <tr>
                            <td style={{ ...td, fontWeight: 700 }} rowSpan={groupItems.length + 1}>{그룹}</td>
                            <td style={{ ...td, fontWeight: 700 }}>계</td><td style={{ ...tdR, fontWeight: 700 }}>{nf(groupSum)}</td>
                          </tr>
                          {groupItems.map((it) => (
                            <tr key={it.id}>
                              <td style={td}>{it.항목명}</td>
                              <td style={tdR}>{nf(fa.values.find((v) => v.항목ID === it.id && v.시설 === fa.시설 && v.년월 === ym)?.값 ?? 0)}</td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, margin: '8px 0 4px' }}>예금잔액명세</div>
          <table style={table}>
            <thead><tr><th style={th}>은행명</th><th style={th}>계좌번호</th><th style={th}>잔액(원)</th><th style={th}>비고</th></tr></thead>
            <tbody>
              {fa.accounts.length === 0 && <Empty colSpan={4} text="등록된 계좌가 없습니다." />}
              {fa.accounts.map((a) => (
                <tr key={a.id}>
                  <td style={td}>{a.은행명}</td><td style={td}>{a.계좌번호}</td>
                  <td style={tdR}>{nf(fa.accountValues.find((v) => v.항목ID === a.id && v.시설 === fa.시설 && v.년월 === ym)?.값 ?? 0)}</td>
                  <td style={td}>{a.비고}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, fontWeight: 700, margin: '8px 0 4px' }}>예산집행현황</div>
          <table style={table}>
            <thead><tr><th style={th}>항목</th><th style={th}>예산액</th><th style={th}>집행액</th><th style={th}>누계</th><th style={th}>비고</th></tr></thead>
            <tbody>
              {fa.budgetRows.length === 0 && <Empty colSpan={5} />}
              {fa.budgetRows.map((r) => (
                <tr key={r.항목ID}>
                  <td style={td}>{r.항목명}</td><td style={tdR}>{nf(r.예산액)}</td><td style={tdR}>{nf(r.집행액)}</td>
                  <td style={tdR}>{nf(r.누계)}</td><td style={td}>{r.비고}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* 7) 후원 */}
      <div style={sectionTitle}>7. 후원현황</div>
      <div style={subTitle}>1) 후원금</div>
      <FacilityStatTable rows={summary.cashSummaryRows} />
      <div style={subTitle}>2) 후원물품(환가액)</div>
      <FacilityStatTable rows={summary.goodsSummaryRows} />
      {donation.facilities.map((fa, fi) => (
        <div key={fa.시설}>
          <div style={subTitle}>{fi + 1}) {fa.시설명} 명단</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, margin: '4px 0' }}>후원금</div>
          <table style={table}>
            <thead><tr><th style={th}>성명</th><th style={th}>후원금액(원)</th><th style={th}>비고</th></tr></thead>
            <tbody>
              {fa.cashDetails.length === 0 && <Empty colSpan={3} />}
              {fa.cashDetails.map((d) => (
                <tr key={d.id}><td style={td}>{d.이름}</td><td style={tdR}>{nf(d.금액)}</td><td style={td}>{d.비고}</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, fontWeight: 700, margin: '8px 0 4px' }}>후원물품</div>
          <table style={table}>
            <thead><tr><th style={th}>후원품</th><th style={th}>수량</th><th style={th}>환가액(원)</th><th style={th}>후원자</th><th style={th}>지급대상</th></tr></thead>
            <tbody>
              {fa.goodsDetails.length === 0 && <Empty colSpan={5} />}
              {fa.goodsDetails.map((d) => (
                <tr key={d.id}>
                  <td style={td}>{d.이름}</td><td style={tdC}>{d.수량}</td><td style={tdR}>{nf(d.금액)}</td>
                  <td style={td}>{d.후원자}</td><td style={td}>{d.지급대상}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* 8) 행정사항 */}
      <div style={sectionTitle}>8. 행정사항</div>
      {adminNotes.length === 0 ? (
        <p style={{ fontSize: 11, color: '#888' }}>등록된 행정사항이 없습니다.</p>
      ) : (
        <ol style={{ fontSize: 11, paddingLeft: 18, whiteSpace: 'pre-wrap' }}>
          {adminNotes.map((n) => <li key={n.id} style={{ marginBottom: 6 }}>{n.내용}</li>)}
        </ol>
      )}
    </div>
  );
}
