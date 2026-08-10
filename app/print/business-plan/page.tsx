import { Fragment } from 'react';
import { getWorklogBusinessNames, getBusinessPlanTree, planGoal, type BasisRow, type BusinessSubNode, type PlanItem } from '@/lib/mutate/businessPlan';
import { hasPageAccess } from '@/lib/mutate/permissions';
import PrintButton from '@/components/print/PrintButton';
import CopyPlanTableButton from '@/components/business/CopyPlanTableButton';
import PageAccessDenied from '@/components/PageAccessDenied';
import { btnSecondary, card } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');

function basisLineText(b: BasisRow): string {
  if (b.직접입력여부) return `${b.라벨} ${nf(b.직접건)}건/${nf(b.직접명)}명`;
  return `${b.라벨} ${nf(b.인원)}명×${nf(b.횟수)}${b.단위}=${nf(b.인원 * b.횟수)}명`;
}

// 한글(HWP)에 붙여넣었을 때 웹 화면처럼 보이지 않도록, 인쇄물(print/business-worklog)에서
// 이미 검증된 것과 같은 오피스 문서 스타일(검은 테두리·회색 헤더)을 그대로 쓴다.
const lbl = { border: '1px solid #000', background: '#f2f2f2', fontWeight: 700 as const, textAlign: 'center' as const, padding: '4px 6px', fontSize: 11 };
const cell = { border: '1px solid #000', padding: '4px 6px', fontSize: 11, verticalAlign: 'top' as const };
const cellC = { ...cell, textAlign: 'center' as const };

type Row = { sub: BusinessSubNode; plan: PlanItem; pi: number; goal: { gc: number; gp: number } };

export default async function BusinessPlanPrintPage() {
  if (!(await hasPageAccess('business-goal'))) return <PageAccessDenied />;

  const businesses = await getWorklogBusinessNames();
  const trees = await Promise.all(businesses.map((b) => getBusinessPlanTree(b)));

  const blocks = businesses.map((business, bi) => {
    const tree = trees[bi];
    const totalRows = tree.reduce((a, s) => a + Math.max(s.plans.length, 1), 0);
    const rows: Row[] = tree.flatMap((sub) =>
      sub.plans.map((plan, pi) => ({ sub, plan, pi, goal: planGoal(sub, plan) }))
    );
    const gp = rows.reduce((a, r) => a + r.goal.gp, 0);
    const budget = rows.reduce((a, r) => a + r.plan.예산, 0);
    return { business, totalRows, rows, gp, budget };
  });
  const grandGp = blocks.reduce((a, b) => a + b.gp, 0);
  const grandBudget = blocks.reduce((a, b) => a + b.budget, 0);

  return (
    <div>
      <div className={`${card} print:hidden flex items-center gap-3`}>
        <PrintButton />
        <CopyPlanTableButton targetId="plan-table" className={btnSecondary} />
      </div>

      <div style={{ width: '277mm', margin: '0 auto', color: '#000' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>2026년도 세부사업계획서(안)</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>사회복지법인 새문안교회사회복지재단 · 시립서대문노인종합복지관</div>
          <div style={{ fontSize: 10.5, marginTop: 2, color: '#555' }}>(단위 : 천원)</div>
        </div>

        <table id="plan-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '10mm' }} /><col style={{ width: '32mm' }} />
            <col style={{ width: '22mm' }} /><col style={{ width: '20mm' }} />
            <col /><col style={{ width: '55mm' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={lbl}>사업분류</th>
              <th style={lbl}>세부사업</th>
              <th style={lbl}>목표<br />(명)</th>
              <th style={lbl}>예산<br />(천원)</th>
              <th style={lbl}>사 업 내 용</th>
              <th style={lbl}>기 대 효 과</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map(({ business, totalRows, rows, gp, budget }, bi) => (
              <Fragment key={business}>
                {rows.map((r, ri) => (
                  <tr key={r.plan.id}>
                    {ri === 0 && <td style={cellC} rowSpan={totalRows}>{bi + 1}. {business}</td>}
                    {r.pi === 0 && <td style={{ ...cellC, fontWeight: 700 }} rowSpan={r.sub.plans.length}>{r.sub.세부사업명}</td>}
                    <td style={{ ...cell, textAlign: 'right' }}>{nf(r.goal.gp)}</td>
                    {r.pi === 0 && (
                      <td style={{ ...cell, textAlign: 'right' }} rowSpan={r.sub.plans.length}>
                        {nf(r.sub.plans.reduce((a, p) => a + p.예산, 0))}
                      </td>
                    )}
                    <td style={cell}>
                      <b>{r.pi + 1}) {r.plan.제목}</b><br />
                      - 내용 : {r.plan.사업내용}
                      {r.plan.basis.length > 0 && <><br />- 인원 : {r.plan.basis.map(basisLineText).join(' / ')}</>}
                    </td>
                    {r.pi === 0 && <td style={cell} rowSpan={r.sub.plans.length}>{r.sub.기대효과}</td>}
                  </tr>
                ))}
                <tr style={{ background: '#f7f7f7', fontWeight: 700 }}>
                  <td style={cellC} colSpan={2}>소 계 · {bi + 1}. {business}</td>
                  <td style={cellC}>{nf(gp)}명</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{nf(budget)}</td>
                  <td style={cell} colSpan={2} />
                </tr>
              </Fragment>
            ))}
            <tr style={{ background: '#dedede', fontWeight: 700 }}>
              <td style={cellC} colSpan={2}>총 계</td>
              <td style={cellC}>{nf(grandGp)}명</td>
              <td style={{ ...cell, textAlign: 'right' }}>{nf(grandBudget)}</td>
              <td style={cell} colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
