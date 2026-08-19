import type { FullBoardReportData } from '@/lib/mutate/boardFullReport';
import { sectionTitle, subTitle, reportTable, th, td, tdC, tdR, totalRow, styleAttr } from '@/components/business/full/reportStyles';

// hwpx 변환(app/api/board-full-report-hwpx)은 Next.js가 라우트 핸들러에서 react-dom/server 직접
// import를 막아서(빌드 에러) FullReportBody.tsx(JSX)를 그대로 문자열화할 수 없다. 그래서 같은
// 내용/순서/스타일(reportStyles.ts 공유)을 문자열 템플릿으로 다시 조립한다 — 마크업 생성 코드
// 자체는 두 곳에 나뉘어 있지만, 스타일 값과 데이터 조립(getFullBoardReportData)은 공유하므로
// 화면에 보이는 내용과 어긋나지 않는다. FullReportBody.tsx를 고치면 이 파일도 같이 맞춰야 한다.

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function nl2br(v: unknown): string {
  return esc(v).replace(/\n/g, '<br/>');
}

const sTitle = styleAttr(sectionTitle);
const sSub = styleAttr(subTitle);
const sTable = styleAttr(reportTable);
const sTh = styleAttr(th);
const sTd = styleAttr(td);
const sTdC = styleAttr(tdC);
const sTdR = styleAttr(tdR);
const sTdBold = styleAttr(td, { fontWeight: 700 });
const sTdRBold = styleAttr(tdR, { fontWeight: 700 });
const sTotalRow = styleAttr(totalRow);
const sEmpty = styleAttr(tdC, { color: '#888' });
const sMini = 'font-size:11.5px;font-weight:700;margin:8px 0 4px';

function emptyRow(colSpan: number, text = '등록된 내용이 없습니다.'): string {
  return `<tr><td style="${sEmpty}" colspan="${colSpan}">${esc(text)}</td></tr>`;
}

function highlightTable(title: string, rows: { 사업명: string; 실시월일: string; 내용: string; 성과: string }[]): string {
  return `
    <div style="${sSub}">${esc(title)}</div>
    <table style="${sTable}">
      <colgroup><col style="width:18%"/><col style="width:12%"/><col/><col style="width:25%"/></colgroup>
      <thead><tr><th style="${sTh}">사업명</th><th style="${sTh}">실시월일</th><th style="${sTh}">내용</th><th style="${sTh}">성과/기대효과</th></tr></thead>
      <tbody>
        ${rows.length === 0 ? emptyRow(4, '체크된 항목이 없습니다.') : rows.map((r) => `
          <tr><td style="${sTd}">${esc(r.사업명)}</td><td style="${sTdC}">${esc(r.실시월일)}</td>
          <td style="${sTd}">${nl2br(r.내용)}</td><td style="${sTd}">${nl2br(r.성과)}</td></tr>
        `).join('')}
      </tbody>
    </table>`;
}

function facilityStatTable(rows: { 시설명: string; 전월누계: number; 금월실적: number; 누계?: number }[], extraTotal = true): string {
  const 합전 = rows.reduce((a, r) => a + r.전월누계, 0);
  const 합금 = rows.reduce((a, r) => a + r.금월실적, 0);
  const 합누 = rows.reduce((a, r) => a + (r.누계 ?? r.전월누계 + r.금월실적), 0);
  return `
    <table style="${sTable}">
      <thead><tr><th style="${sTh}">시설명</th><th style="${sTh}">전월누계</th><th style="${sTh}">금월실적</th><th style="${sTh}">누계</th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr><td style="${sTd}">${esc(r.시설명)}</td><td style="${sTdR}">${nf(r.전월누계)}</td>
          <td style="${sTdR}">${nf(r.금월실적)}</td><td style="${sTdR}">${nf(r.누계 ?? r.전월누계 + r.금월실적)}</td></tr>
        `).join('')}
        ${extraTotal ? `<tr style="${sTotalRow}"><td style="${sTd}">합 계</td><td style="${sTdR}">${nf(합전)}</td><td style="${sTdR}">${nf(합금)}</td><td style="${sTdR}">${nf(합누)}</td></tr>` : ''}
      </tbody>
    </table>`;
}

export function renderFullReportHtml(data: FullBoardReportData): string {
  const { ym, summary, report, performance, headcount, volunteers, accounting, donation, adminNotes } = data;

  const reportSections = ([
    ['1) 사업보고', report.사업보고, report.사업보고기간, '성과'],
    ['2) 사업계획', report.사업계획, report.사업계획기간, '기대효과'],
  ] as const).map(([title, entries, period, col]) => `
    <div style="${sSub}">${esc(title)}${period ? ` (${esc(period)})` : ''}</div>
    <table style="${sTable}">
      <colgroup><col style="width:18%"/><col style="width:12%"/><col/><col style="width:22%"/></colgroup>
      <thead><tr><th style="${sTh}">사업명</th><th style="${sTh}">실시월일</th><th style="${sTh}">내용</th><th style="${sTh}">${esc(col)}</th></tr></thead>
      <tbody>
        ${entries.length === 0 ? emptyRow(4) : entries.map((e) => `
          <tr><td style="${sTd}">${esc(e.사업명)}</td><td style="${sTdC}">${esc(e.실시월일)}</td>
          <td style="${sTd}">${nl2br(e.내용)}</td><td style="${sTd}">${nl2br(e.성과)}</td></tr>
        `).join('')}
      </tbody>
    </table>`).join('');

  const performanceRows = performance.businesses.map((b) => `
    ${b.subRows.length === 0
      ? `<tr><td style="${sTd}">${esc(b.business)}</td><td style="${styleAttr(td, { color: '#888' })}" colspan="9">등록된 계획 없음</td></tr>`
      : b.subRows.map((r, i) => `
        <tr>
          ${i === 0 ? `<td style="${sTdBold}" rowspan="${b.subRows.length}">${esc(b.business)}</td>` : ''}
          <td style="${sTd}">${esc(r.세부사업명)}</td>
          <td style="${sTdR}">${nf(r.목표건)}</td><td style="${sTdR}">${nf(r.목표명)}</td>
          <td style="${sTdR}">${nf(r.전월누계건)}</td><td style="${sTdR}">${nf(r.전월누계명)}</td>
          <td style="${sTdR}">${nf(r.금월실적건)}</td><td style="${sTdR}">${nf(r.금월실적명)}</td>
          <td style="${sTdRBold}">${nf(r.누계건)}</td><td style="${sTdRBold}">${nf(r.누계명)}</td>
        </tr>`).join('')}
    <tr style="${sTotalRow}">
      <td style="${sTd}" colspan="2">소계 · ${esc(b.business)}</td>
      <td style="${sTdR}">${nf(b.goalC)}</td><td style="${sTdR}">${nf(b.goalP)}</td>
      <td style="${sTdR}">${nf(b.prevC)}</td><td style="${sTdR}">${nf(b.prevP)}</td>
      <td style="${sTdR}">${nf(b.curC)}</td><td style="${sTdR}">${nf(b.curP)}</td>
      <td style="${sTdR}">${nf(b.cumC)}</td><td style="${sTdR}">${nf(b.cumP)}</td>
    </tr>`).join('');

  const accountingHtml = accounting.facilities.map((fa, fi) => {
    const sections = ([['수 입', fa.income], ['지 출', fa.expense]] as const).map(([label, items]) => {
      const groups = new Map<string, typeof items>();
      items.forEach((it) => {
        if (!groups.has(it.그룹)) groups.set(it.그룹, []);
        groups.get(it.그룹)!.push(it);
      });
      const rowsHtml = items.length === 0 ? emptyRow(3) : [...groups.entries()].map(([그룹, groupItems]) => {
        const groupSum = groupItems.reduce((a, it) => a + (fa.values.find((v) => v.항목ID === it.id && v.시설 === fa.시설 && v.년월 === ym)?.값 ?? 0), 0);
        if (groupItems.length === 1) {
          return `<tr><td style="${sTdBold}" colspan="2">${esc(그룹)}</td><td style="${sTdR}">${nf(groupSum)}</td></tr>`;
        }
        return `
          <tr>
            <td style="${sTdBold}" rowspan="${groupItems.length + 1}">${esc(그룹)}</td>
            <td style="${sTdBold}">계</td><td style="${sTdRBold}">${nf(groupSum)}</td>
          </tr>
          ${groupItems.map((it) => `
            <tr><td style="${sTd}">${esc(it.항목명)}</td>
            <td style="${sTdR}">${nf(fa.values.find((v) => v.항목ID === it.id && v.시설 === fa.시설 && v.년월 === ym)?.값 ?? 0)}</td></tr>
          `).join('')}`;
      }).join('');
      return `
        <table style="${sTable}">
          <thead><tr><th style="${sTh}" colspan="2">${label}</th><th style="${sTh}">금액(원)</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>`;
    }).join('');

    return `
      <div style="${sSub}">${fi + 1}) ${esc(fa.시설명)}</div>
      <div style="${sMini}">수입지출 명세</div>
      ${sections}
      <div style="${sMini}">예금잔액명세</div>
      <table style="${sTable}">
        <thead><tr><th style="${sTh}">은행명</th><th style="${sTh}">계좌번호</th><th style="${sTh}">잔액(원)</th><th style="${sTh}">비고</th></tr></thead>
        <tbody>
          ${fa.accounts.length === 0 ? emptyRow(4, '등록된 계좌가 없습니다.') : fa.accounts.map((a) => `
            <tr><td style="${sTd}">${esc(a.은행명)}</td><td style="${sTd}">${esc(a.계좌번호)}</td>
            <td style="${sTdR}">${nf(fa.accountValues.find((v) => v.항목ID === a.id && v.시설 === fa.시설 && v.년월 === ym)?.값 ?? 0)}</td>
            <td style="${sTd}">${esc(a.비고)}</td></tr>
          `).join('')}
        </tbody>
      </table>
      <div style="${sMini}">예산집행현황</div>
      <table style="${sTable}">
        <thead><tr><th style="${sTh}">항목</th><th style="${sTh}">예산액</th><th style="${sTh}">집행액</th><th style="${sTh}">누계</th><th style="${sTh}">비고</th></tr></thead>
        <tbody>
          ${fa.budgetRows.length === 0 ? emptyRow(5) : fa.budgetRows.map((r) => `
            <tr><td style="${sTd}">${esc(r.항목명)}</td><td style="${sTdR}">${nf(r.예산액)}</td>
            <td style="${sTdR}">${nf(r.집행액)}</td><td style="${sTdR}">${nf(r.누계)}</td><td style="${sTd}">${esc(r.비고)}</td></tr>
          `).join('')}
        </tbody>
      </table>`;
  }).join('');

  const donationHtml = donation.facilities.map((fa, fi) => `
    <div style="${sSub}">${fi + 1}) ${esc(fa.시설명)} 명단</div>
    <div style="${sMini}">후원금</div>
    <table style="${sTable}">
      <thead><tr><th style="${sTh}">성명</th><th style="${sTh}">후원금액(원)</th><th style="${sTh}">비고</th></tr></thead>
      <tbody>
        ${fa.cashDetails.length === 0 ? emptyRow(3) : fa.cashDetails.map((d) => `
          <tr><td style="${sTd}">${esc(d.이름)}</td><td style="${sTdR}">${nf(d.금액)}</td><td style="${sTd}">${esc(d.비고)}</td></tr>
        `).join('')}
      </tbody>
    </table>
    <div style="${sMini}">후원물품</div>
    <table style="${sTable}">
      <thead><tr><th style="${sTh}">후원품</th><th style="${sTh}">수량</th><th style="${sTh}">환가액(원)</th><th style="${sTh}">후원자</th><th style="${sTh}">지급대상</th></tr></thead>
      <tbody>
        ${fa.goodsDetails.length === 0 ? emptyRow(5) : fa.goodsDetails.map((d) => `
          <tr><td style="${sTd}">${esc(d.이름)}</td><td style="${sTdC}">${esc(d.수량)}</td><td style="${sTdR}">${nf(d.금액)}</td>
          <td style="${sTd}">${esc(d.후원자)}</td><td style="${sTd}">${esc(d.지급대상)}</td></tr>
        `).join('')}
      </tbody>
    </table>`).join('');

  // hwpxjs의 HTML→HWPX 변환은 div/table을 다른 div로 감싸면(중첩) 그 안의 구조(표/문단 구분)를
  // 전부 하나의 텍스트로 뭉개버리는 버그가 있다(직접 재현/확인함) — 그래서 이 문서는 감싸는
  // 컨테이너 div 없이 모든 제목/표/목록을 body 바로 아래 형제 요소로만 나열한다. 회계 수입/지출
  // 표를 나란히 두던 flex 컨테이너도 같은 이유로 빼고 순서대로(위아래) 나열한다.
  return `
  <div style="text-align:center;font-size:20px;font-weight:700">서대문노인종합복지관 이사회 자료</div>
  <div style="text-align:center;font-size:12px;margin-bottom:14px;color:#555">${esc(ym)}</div>

  <div style="${sTitle}">1. 요약 업무보고</div>
  ${highlightTable('1) 사업보고', summary.사업보고하이라이트)}
  ${highlightTable('2) 사업계획', summary.사업계획하이라이트)}
  <div style="${sSub}">3) 서비스 제공 인원 현황</div>
  ${facilityStatTable(summary.serviceRows)}
  <div style="${sSub}">4) 자원봉사자 현황 요약</div>
  ${facilityStatTable(summary.volunteerRows)}
  <div style="${sSub}">5) 수입지출현황</div>
  <table style="${sTable}">
    <thead><tr><th style="${sTh}">시설명</th><th style="${sTh}">전월잔액</th><th style="${sTh}">금월수입</th><th style="${sTh}">금월지출</th><th style="${sTh}">잔액</th></tr></thead>
    <tbody>
      ${summary.accountingSummaryRows.map((r) => `
        <tr><td style="${sTd}">${esc(r.시설명)}</td><td style="${sTdR}">${nf(r.전월잔액)}</td><td style="${sTdR}">${nf(r.금월수입)}</td>
        <td style="${sTdR}">${nf(r.금월지출)}</td><td style="${sTdR}">${nf(r.잔액)}</td></tr>
      `).join('')}
    </tbody>
  </table>
  <div style="${sSub}">6) 예금잔액총액: ${nf(summary.예금잔액총액)}원</div>
  <div style="${sSub}">7-1) 후원금</div>
  ${facilityStatTable(summary.cashSummaryRows)}
  <div style="${sSub}">7-2) 후원물품(환가액)</div>
  ${facilityStatTable(summary.goodsSummaryRows)}
  <div style="${sSub}">8) 행정사항</div>
  ${summary.adminNoteSummaries.length === 0
    ? '<p style="font-size:11px;color:#888">등록된 행정사항이 없습니다.</p>'
    : summary.adminNoteSummaries.map((n) => `<div style="font-size:11px;margin-bottom:4px">${nl2br(n.내용)}</div>`).join('')}

  <div style="${sTitle}">2. 업무보고</div>
  ${reportSections}

  <div style="${sTitle}">3. 전체사업 실적집계</div>
  <table style="${sTable}">
    <colgroup><col style="width:14%"/><col style="width:16%"/><col style="width:7%"/><col style="width:7%"/><col style="width:7%"/><col style="width:7%"/><col style="width:7%"/><col style="width:7%"/><col style="width:7%"/><col style="width:7%"/></colgroup>
    <thead>
      <tr>
        <th style="${sTh}" rowspan="2">사업</th><th style="${sTh}" rowspan="2">세부사업</th>
        <th style="${sTh}" colspan="2">연간목표</th><th style="${sTh}" colspan="2">전월누계</th>
        <th style="${sTh}" colspan="2">금월실적</th><th style="${sTh}" colspan="2">누계</th>
      </tr>
      <tr>
        <th style="${sTh}">건</th><th style="${sTh}">명</th><th style="${sTh}">건</th><th style="${sTh}">명</th>
        <th style="${sTh}">건</th><th style="${sTh}">명</th><th style="${sTh}">건</th><th style="${sTh}">명</th>
      </tr>
    </thead>
    <tbody>
      ${performanceRows}
      <tr style="${styleAttr(totalRow, { background: '#ddd' })}">
        <td style="${sTd}" colspan="2">총 계</td>
        <td style="${sTdR}">${nf(performance.grandGoalC)}</td><td style="${sTdR}">${nf(performance.grandGoalP)}</td>
        <td style="${sTdR}">${nf(performance.grandPrevC)}</td><td style="${sTdR}">${nf(performance.grandPrevP)}</td>
        <td style="${sTdR}">${nf(performance.grandCurC)}</td><td style="${sTdR}">${nf(performance.grandCurP)}</td>
        <td style="${sTdR}">${nf(performance.grandCumC)}</td><td style="${sTdR}">${nf(performance.grandCumP)}</td>
      </tr>
    </tbody>
  </table>

  <div style="${sTitle}">4. 실인원 산출내역${headcount.headcountDate ? ` (${esc(headcount.headcountDate)} 기준)` : ''}</div>
  <table style="${sTable}">
    <colgroup><col/><col style="width:15%"/><col style="width:30%"/></colgroup>
    <thead><tr><th style="${sTh}">사업 구분</th><th style="${sTh}">실인원(명)</th><th style="${sTh}">비고</th></tr></thead>
    <tbody>
      ${headcount.rows.length === 0 ? emptyRow(3) : headcount.rows.map((r) => `
        <tr><td style="${sTd}">${esc(r.항목명)}</td><td style="${sTdR}">${nf(r.실인원)}</td><td style="${sTd}">${esc(r.비고)}</td></tr>
      `).join('')}
      ${headcount.rows.length > 0 ? `<tr style="${sTotalRow}"><td style="${sTd}">합 계</td><td style="${sTdR}">${nf(headcount.합계)}</td><td style="${sTd}"></td></tr>` : ''}
    </tbody>
  </table>

  <div style="${sTitle}">5. 자원봉사자 현황</div>
  <div style="${sSub}">1) 총괄</div>
  ${facilityStatTable(volunteers.rows.map((r) => ({ 시설명: r.항목명, 전월누계: 0, 금월실적: r.소계 })), false)}
  <div style="${sSub}">2) 분야별 명단</div>
  <table style="${sTable}">
    <colgroup><col style="width:20%"/><col style="width:8%"/><col/><col/></colgroup>
    <thead><tr><th style="${sTh}">봉사분야</th><th style="${sTh}">인원수</th><th style="${sTh}">단체 명단</th><th style="${sTh}">일반 명단</th></tr></thead>
    <tbody>
      ${volunteers.rows.filter((r) => r.소계 > 0).length === 0 ? emptyRow(4, '등록된 명단이 없습니다.') : volunteers.rows.filter((r) => r.소계 > 0).map((r) => `
        <tr><td style="${sTd}">${esc(r.항목명)}</td><td style="${sTdR}">${r.소계}</td>
        <td style="${sTd}">${esc(r.단체이름.join(' '))}</td><td style="${sTd}">${esc(r.일반이름.join(' '))}</td></tr>
      `).join('')}
      <tr style="${sTotalRow}">
        <td style="${sTd}">합 계</td><td style="${sTdR}">${nf(volunteers.grand소계)}</td>
        <td style="${sTdR}">${nf(volunteers.grand단체)}</td><td style="${sTdR}">${nf(volunteers.grand일반)}</td>
      </tr>
    </tbody>
  </table>

  <div style="${sTitle}">6. 회계</div>
  ${accountingHtml}

  <div style="${sTitle}">7. 후원현황</div>
  <div style="${sSub}">1) 후원금</div>
  ${facilityStatTable(summary.cashSummaryRows)}
  <div style="${sSub}">2) 후원물품(환가액)</div>
  ${facilityStatTable(summary.goodsSummaryRows)}
  ${donationHtml}

  <div style="${sTitle}">8. 행정사항</div>
  ${adminNotes.length === 0
    ? '<p style="font-size:11px;color:#888">등록된 행정사항이 없습니다.</p>'
    : adminNotes.map((n) => `<div style="font-size:11px;margin-bottom:6px">${nl2br(n.내용)}</div>`).join('')}
`;
}
