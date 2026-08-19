import {
  FACILITIES, FACILITY_LABEL, getModuleItems, getModuleValues, priorCumulative, valueFor,
  OVERVIEW_SERVICE_HEADCOUNT_ITEM_ID, type BoardStatValue,
} from '@/lib/mutate/boardStat';
import { getSummaryHighlights, getBoardPlanEntries, getReportPeriod, type BoardPlanEntry } from '@/lib/mutate/boardPlan';
import { getVolunteerFacilitySummary, getRosterByItems, summarizeRoster, type RosterSummaryRow } from '@/lib/mutate/boardRoster';
import { getAccountingItems, computeFacilityTotals, type AccountingItem } from '@/lib/mutate/boardAccounting';
import { getBankAccounts, type BankAccount } from '@/lib/mutate/boardBankAccount';
import { getBudgetRows, type BudgetRow } from '@/lib/mutate/boardBudgetExecution';
import {
  getDonationDetails, getDonationDetailsForYear, donationPriorCumulative, donationValueFor, type DonationDetail,
} from '@/lib/mutate/boardDonation';
import { getAdminNotes, type AdminNote } from '@/lib/mutate/boardAdminNote';
import { getHeadcountDate } from '@/lib/mutate/boardHeadcount';
import { getWorklogBusinessNames, buildWorklogItems } from '@/lib/mutate/businessPlan';
import { getDailyEntries, rangeSum } from '@/lib/mutate/worklogEntry';

// "이사회자료 전체 통" 화면/인쇄본 2곳에서 전부 같은 데이터가 필요해서, 조회월 하나만 받아
// 필요한 걸 전부 모아주는 단일 조립 함수로 뺐다 — 각 도메인 모듈의 기존 조회 함수만 그대로
// 재사용하고 새 계산 로직은 추가하지 않는다(이미 각 탭에서 검증된 계산식 그대로).

export type FacilityStatRow = { 시설명: string; 전월누계: number; 금월실적: number; 누계?: number };

export type PerformanceSubRow = {
  세부사업명: string; 목표건: number; 목표명: number;
  전월누계건: number; 전월누계명: number; 금월실적건: number; 금월실적명: number; 누계건: number; 누계명: number;
};
export type PerformanceBusinessRow = {
  business: string; subRows: PerformanceSubRow[];
  goalC: number; goalP: number; prevC: number; prevP: number; curC: number; curP: number; cumC: number; cumP: number;
};

export type AccountingFacilitySection = {
  시설: string; 시설명: string;
  income: AccountingItem[]; expense: AccountingItem[]; values: BoardStatValue[];
  accounts: BankAccount[]; accountValues: BoardStatValue[];
  budgetRows: BudgetRow[];
};

export type DonationFacilitySection = {
  시설: string; 시설명: string;
  cashDetails: DonationDetail[]; goodsDetails: DonationDetail[];
};

export type FullBoardReportData = {
  ym: string;
  summary: {
    사업보고하이라이트: BoardPlanEntry[]; 사업계획하이라이트: BoardPlanEntry[];
    serviceRows: FacilityStatRow[]; volunteerRows: FacilityStatRow[];
    accountingSummaryRows: { 시설명: string; 전월잔액: number; 금월수입: number; 금월지출: number; 잔액: number }[];
    예금잔액총액: number;
    cashSummaryRows: (FacilityStatRow & { 누계: number })[]; goodsSummaryRows: (FacilityStatRow & { 누계: number })[];
    adminNoteSummaries: { id: string; 내용: string }[];
  };
  report: {
    사업보고: BoardPlanEntry[]; 사업계획: BoardPlanEntry[]; 사업보고기간: string; 사업계획기간: string;
  };
  performance: {
    businesses: PerformanceBusinessRow[];
    grandGoalC: number; grandGoalP: number; grandPrevC: number; grandPrevP: number;
    grandCurC: number; grandCurP: number; grandCumC: number; grandCumP: number;
  };
  headcount: {
    rows: { id: string; 항목명: string; 실인원: number; 비고: string }[];
    headcountDate: string; 합계: number;
  };
  volunteers: {
    rows: RosterSummaryRow[]; grand단체: number; grand일반: number; grand소계: number;
  };
  accounting: {
    facilities: AccountingFacilitySection[];
  };
  donation: {
    facilities: DonationFacilitySection[];
  };
  adminNotes: AdminNote[];
};

export async function getFullBoardReportData(ym: string): Promise<FullBoardReportData> {
  const year = ym.slice(0, 4);

  // ── 요약 ──
  const [사업보고하이라이트, 사업계획하이라이트] = await Promise.all([
    getSummaryHighlights('사업보고', ym),
    getSummaryHighlights('사업계획', ym),
  ]);
  const serviceValues = await getModuleValues([OVERVIEW_SERVICE_HEADCOUNT_ITEM_ID]);
  const serviceRows = FACILITIES.map((f) => ({
    시설명: FACILITY_LABEL[f] ?? f,
    전월누계: priorCumulative(serviceValues, OVERVIEW_SERVICE_HEADCOUNT_ITEM_ID, f, ym),
    금월실적: valueFor(serviceValues, OVERVIEW_SERVICE_HEADCOUNT_ITEM_ID, f, ym),
  }));
  const volunteerRows = await getVolunteerFacilitySummary(ym);

  const accItemsByFacility = await Promise.all(FACILITIES.map((f) => getAccountingItems(f)));
  const allAccItems = accItemsByFacility.flat();
  const allAccValues = await getModuleValues(allAccItems.map((i) => i.id));
  const accountingSummaryRows = FACILITIES.map((f) => ({
    시설명: FACILITY_LABEL[f] ?? f, ...computeFacilityTotals(allAccItems, allAccValues, f, ym),
  }));

  const accountsByFacility = await Promise.all(FACILITIES.map((f) => getBankAccounts(f)));
  const allAccounts = accountsByFacility.flat();
  const allAccountValues = await getModuleValues(allAccounts.map((a) => a.id));
  const 예금잔액총액 = allAccounts.reduce((sum, a) => sum + valueFor(allAccountValues, a.id, a.시설, ym), 0);

  const [현금연간, 물품연간] = await Promise.all([
    Promise.all(FACILITIES.map((f) => getDonationDetailsForYear('후원금', f, year))),
    Promise.all(FACILITIES.map((f) => getDonationDetailsForYear('후원물품', f, year))),
  ]);
  const cashSummaryRows = FACILITIES.map((f, i) => {
    const 전월누계 = donationPriorCumulative(현금연간[i], '후원금', f, ym);
    const 금월실적 = donationValueFor(현금연간[i], '후원금', f, ym);
    return { 시설명: FACILITY_LABEL[f] ?? f, 전월누계, 금월실적, 누계: 전월누계 + 금월실적 };
  });
  const goodsSummaryRows = FACILITIES.map((f, i) => {
    const 전월누계 = donationPriorCumulative(물품연간[i], '후원물품', f, ym);
    const 금월실적 = donationValueFor(물품연간[i], '후원물품', f, ym);
    return { 시설명: FACILITY_LABEL[f] ?? f, 전월누계, 금월실적, 누계: 전월누계 + 금월실적 };
  });

  const adminNoteSummaries = (await getAdminNotes(ym)).filter((n) => n.요약포함).map((n) => ({
    id: n.id, 내용: n.요약내용.trim() || n.내용,
  }));

  // ── 업무보고 ──
  const [사업보고, 사업계획, 사업보고기간, 사업계획기간] = await Promise.all([
    getBoardPlanEntries('사업보고', ym),
    getBoardPlanEntries('사업계획', ym),
    getReportPeriod('사업보고', ym),
    getReportPeriod('사업계획', ym),
  ]);

  // ── 사업실적 ──
  const worklogBusinesses = await getWorklogBusinessNames();
  const yearStart = `${year}-01-01`;
  const monthStart = `${ym}-01`;
  const [yy, mm] = ym.split('-').map(Number);
  const cumEnd = `${new Date(Date.UTC(yy, mm, 0)).getUTCFullYear()}-${String(mm).padStart(2, '0')}-${String(new Date(Date.UTC(yy, mm, 0)).getUTCDate()).padStart(2, '0')}`;
  const perBusiness: PerformanceBusinessRow[] = await Promise.all(
    worklogBusinesses.map(async (business) => {
      const [items, entries] = await Promise.all([buildWorklogItems(business), getDailyEntries(business)]);
      const groups = new Map<string, typeof items>();
      items.forEach((i) => {
        if (!groups.has(i.세부사업명)) groups.set(i.세부사업명, []);
        groups.get(i.세부사업명)!.push(i);
      });
      const subRows: PerformanceSubRow[] = [...groups.entries()].map(([세부사업명, groupItems]) => {
        const subIds = groupItems.map((i) => i.id);
        const [cumC, cumP] = rangeSum(entries, subIds, yearStart, cumEnd);
        const [curC, curP] = rangeSum(entries, subIds, monthStart, cumEnd);
        return {
          세부사업명,
          목표건: groupItems.reduce((a, i) => a + i.목표건, 0),
          목표명: groupItems.reduce((a, i) => a + i.목표명, 0),
          전월누계건: cumC - curC, 전월누계명: cumP - curP,
          금월실적건: curC, 금월실적명: curP,
          누계건: cumC, 누계명: cumP,
        };
      });
      return {
        business, subRows,
        goalC: subRows.reduce((a, r) => a + r.목표건, 0),
        goalP: subRows.reduce((a, r) => a + r.목표명, 0),
        prevC: subRows.reduce((a, r) => a + r.전월누계건, 0),
        prevP: subRows.reduce((a, r) => a + r.전월누계명, 0),
        curC: subRows.reduce((a, r) => a + r.금월실적건, 0),
        curP: subRows.reduce((a, r) => a + r.금월실적명, 0),
        cumC: subRows.reduce((a, r) => a + r.누계건, 0),
        cumP: subRows.reduce((a, r) => a + r.누계명, 0),
      };
    })
  );

  // ── 실인원 ──
  const headcountItems = await getModuleItems('실인원');
  const [headcountValues, headcountDate] = await Promise.all([
    getModuleValues(headcountItems.map((i) => i.id)),
    getHeadcountDate(ym),
  ]);
  const headcountRows = headcountItems.map((i) => ({
    id: i.id, 항목명: i.항목명,
    실인원: valueFor(headcountValues, i.id, '전체', ym),
    비고: headcountValues.find((v) => v.항목ID === i.id && v.시설 === '전체' && v.년월 === ym)?.비고 ?? '',
  }));

  // ── 자원봉사자 ──
  const volunteerItems = await getModuleItems('자원봉사자');
  const roster = await getRosterByItems(volunteerItems.map((i) => i.id), ym);
  const rosterRows = summarizeRoster(volunteerItems, roster);

  // ── 회계 ──
  const accountingFacilities: AccountingFacilitySection[] = await Promise.all(
    FACILITIES.map(async (f) => {
      const items = accItemsByFacility[FACILITIES.indexOf(f)];
      const income = items.filter((i) => i.구분 === '수입');
      const expense = items.filter((i) => i.구분 === '지출');
      const budgetRows = await getBudgetRows(f, ym);
      const accounts = accountsByFacility[FACILITIES.indexOf(f)];
      return {
        시설: f, 시설명: FACILITY_LABEL[f] ?? f,
        income, expense, values: allAccValues,
        accounts, accountValues: allAccountValues,
        budgetRows,
      };
    })
  );

  // ── 후원 ──
  const donationFacilities: DonationFacilitySection[] = await Promise.all(
    FACILITIES.map(async (f) => {
      const [cashDetails, goodsDetails] = await Promise.all([
        getDonationDetails('후원금', f, ym),
        getDonationDetails('후원물품', f, ym),
      ]);
      return { 시설: f, 시설명: FACILITY_LABEL[f] ?? f, cashDetails, goodsDetails };
    })
  );

  // ── 행정사항 ──
  const adminNotes = await getAdminNotes(ym);

  return {
    ym,
    summary: {
      사업보고하이라이트, 사업계획하이라이트, serviceRows, volunteerRows, accountingSummaryRows,
      예금잔액총액, cashSummaryRows, goodsSummaryRows, adminNoteSummaries,
    },
    report: { 사업보고, 사업계획, 사업보고기간, 사업계획기간 },
    performance: {
      businesses: perBusiness,
      grandGoalC: perBusiness.reduce((a, b) => a + b.goalC, 0),
      grandGoalP: perBusiness.reduce((a, b) => a + b.goalP, 0),
      grandPrevC: perBusiness.reduce((a, b) => a + b.prevC, 0),
      grandPrevP: perBusiness.reduce((a, b) => a + b.prevP, 0),
      grandCurC: perBusiness.reduce((a, b) => a + b.curC, 0),
      grandCurP: perBusiness.reduce((a, b) => a + b.curP, 0),
      grandCumC: perBusiness.reduce((a, b) => a + b.cumC, 0),
      grandCumP: perBusiness.reduce((a, b) => a + b.cumP, 0),
    },
    headcount: { rows: headcountRows, headcountDate, 합계: headcountRows.reduce((a, r) => a + r.실인원, 0) },
    volunteers: {
      rows: rosterRows,
      grand단체: rosterRows.reduce((a, r) => a + r.단체, 0),
      grand일반: rosterRows.reduce((a, r) => a + r.일반, 0),
      grand소계: rosterRows.reduce((a, r) => a + r.소계, 0),
    },
    accounting: { facilities: accountingFacilities },
    donation: { facilities: donationFacilities },
    adminNotes,
  };
}
