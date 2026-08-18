import { getKeyedList, upsertKeyedRecords } from '@/lib/mutate/keyedTable';
import { BOARD_BUDGET_AMOUNT_TABLE } from '@/lib/sheets/registry';
import { priorCumulative, valueFor, type BoardStatValue } from '@/lib/mutate/boardStat';
import type { AccountingItem } from '@/lib/mutate/boardAccounting';

// 참고 서식 "( 5 ) 월말 현재 예산집행현황"의 카테고리. "사업비"는 원래 기본사업비/특정보조사업비로
// 더 나뉘어 있었는데, 세부항목별 재원(자체재원/보조금)은 회계담당자만 판단 가능해서(이름만으로
// 추론 불가) 지금은 한 카테고리로 묶어둔다 — 분류 기준이 정해지면 categoryFor()만 손보면 된다.
export const BUDGET_CATEGORIES = [
  '인건비', '업무추진비', '운영비', '재산조성비', '기능보강사업비', '사업비', '후원사업비', '잡지출 등',
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

// 이미 있는 수입지출현황 지출 항목(그룹+항목명)에서 규칙 기반으로 카테고리를 판정한다.
// 사무비 그룹의 세부항목명(인건비/업무추진비/운영비)은 그대로 카테고리명과 같고, 재산조성비/기능보강
// 그룹은 그룹 전체가 한 카테고리, 사업비 그룹은 이름에 "후원"이 들어가면 후원사업비로 분리하고
// 나머지는 사업비로, 그 외 그룹(반환금/잡지출/전출금/예비비/적립금 및 준비금 등)은 전부 잡지출 등으로 묶는다.
export function categoryFor(item: { 그룹: string; 항목명: string }): BudgetCategory {
  if (item.항목명 === '인건비') return '인건비';
  if (item.항목명 === '업무추진비') return '업무추진비';
  if (item.항목명 === '운영비') return '운영비';
  if (item.그룹 === '재산조성비') return '재산조성비';
  if (item.그룹 === '기능보강') return '기능보강사업비';
  if (item.그룹 === '사업비') return item.항목명.includes('후원') ? '후원사업비' : '사업비';
  return '잡지출 등';
}

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getBudgetAmounts(시설: string, year: string): Promise<Record<string, number>> {
  const rows = await getKeyedList(BOARD_BUDGET_AMOUNT_TABLE);
  const result: Record<string, number> = {};
  for (const c of BUDGET_CATEGORIES) result[c] = 0;
  for (const r of rows) {
    if (r.시설 === 시설 && r.연도 === year) result[r.카테고리] = num(r.예산액);
  }
  return result;
}

export async function setBudgetAmounts(시설: string, year: string, amounts: Record<string, number>): Promise<void> {
  const items = BUDGET_CATEGORIES.map((c) => ({
    keyValues: { 시설, 카테고리: c, 연도: year },
    record: { 시설, 카테고리: c, 연도: year, 예산액: String(amounts[c] || 0) },
  }));
  await upsertKeyedRecords(BOARD_BUDGET_AMOUNT_TABLE, items);
}

export type BudgetExecutionRow = {
  카테고리: BudgetCategory;
  예산액: number;
  집행액: number;
  누계: number;
  집행률: number | null;
};

// 카테고리별 집행액(당월)/누계(연초~당월 포함)를 기존 지출 항목 값에서 그대로 계산한다 — 이
// 표를 위해 새로 저장하는 값은 예산액뿐이다.
export function getBudgetExecutionRows(
  expenseItems: AccountingItem[],
  values: BoardStatValue[],
  budgetAmounts: Record<string, number>,
  시설: string,
  ym: string
): BudgetExecutionRow[] {
  const facilityItems = expenseItems.filter((i) => i.시설 === 시설);
  return BUDGET_CATEGORIES.map((카테고리) => {
    const itemsInCategory = facilityItems.filter((i) => categoryFor(i) === 카테고리);
    const 집행액 = itemsInCategory.reduce((a, i) => a + valueFor(values, i.id, 시설, ym), 0);
    const 전월누계 = itemsInCategory.reduce((a, i) => a + priorCumulative(values, i.id, 시설, ym), 0);
    const 누계 = 전월누계 + 집행액;
    const 예산액 = budgetAmounts[카테고리] || 0;
    return { 카테고리, 예산액, 집행액, 누계, 집행률: 예산액 > 0 ? (누계 / 예산액) * 100 : null };
  });
}
