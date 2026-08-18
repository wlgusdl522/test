import { randomUUID } from 'crypto';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord } from '@/lib/mutate/keyedTable';
import { BOARD_STAT_ITEM_TABLE } from '@/lib/sheets/registry';
import { valueFor, type BoardStatValue } from '@/lib/mutate/boardStat';
import { isCarryForwardItem } from '@/lib/mutate/accountingConstants';

export type AccountingSection = '수입' | '지출';

// 회계는 시설(복지관/요양센터/데이케어센터)마다 항목 구성 자체가 다르고, 수입/지출 각각
// 그룹(예: "보조금수입", "사무비") 아래 세부항목이 여러 개 딸린 구조라 이사회항목에
// 시설/구분/그룹을 추가로 채운다(다른 모듈은 이 3개 컬럼을 안 씀).
export type AccountingItem = {
  id: string;
  시설: string;
  구분: AccountingSection;
  그룹: string;
  항목명: string;
  정렬순서: number;
};


function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getAccountingItems(시설: string): Promise<AccountingItem[]> {
  const rows = await getKeyedList(BOARD_STAT_ITEM_TABLE);
  return rows
    .filter((r) => r.모듈 === '회계' && r.시설 === 시설 && r.id)
    .map((r) => ({
      id: r.id, 시설: r.시설, 구분: (r.구분 === '지출' ? '지출' : '수입') as AccountingSection,
      그룹: r.그룹 || r.항목명, 항목명: r.항목명, 정렬순서: num(r.정렬순서),
    }))
    .sort((a, b) => a.정렬순서 - b.정렬순서);
}

// 정렬순서는 같은 시설 안에서도 구분(수입/지출)별로 따로 매긴다 — 그래야 수입 항목을 추가/이동해도
// 지출 목록 순서에 영향이 없다. 두 구분의 정렬순서 값 범위가 서로 겹쳐도 상관없다(항상 구분으로
// 먼저 걸러서 쓰므로).
function itemsInSection(items: AccountingItem[], 구분: AccountingSection): AccountingItem[] {
  return items.filter((i) => i.구분 === 구분).sort((a, b) => a.정렬순서 - b.정렬순서);
}

export async function addAccountingItem(
  시설: string, 구분: AccountingSection, 그룹: string, 항목명: string
): Promise<void> {
  const section = itemsInSection(await getAccountingItems(시설), 구분);
  const nextOrder = Math.max(0, ...section.map((i) => i.정렬순서)) + 1;
  const name = 항목명.trim() || '새 항목';
  await addKeyedRecord(BOARD_STAT_ITEM_TABLE, {
    id: randomUUID(), 모듈: '회계', 항목명: name, 정렬순서: String(nextOrder),
    시설, 구분, 그룹: 그룹.trim() || name,
  });
}

export async function deleteAccountingItem(id: string): Promise<void> {
  await deleteKeyedRecord(BOARD_STAT_ITEM_TABLE, { id });
}

// 같은 시설+구분 안에서 정렬순서 값을 이웃 항목과 맞바꿔 위/아래로 이동시킨다.
export async function moveAccountingItem(시설: string, id: string, direction: 'up' | 'down'): Promise<void> {
  const items = await getAccountingItems(시설);
  const target = items.find((i) => i.id === id);
  if (!target) return;
  const section = itemsInSection(items, target.구분);
  const idx = section.findIndex((i) => i.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= section.length) return;
  const a = section[idx];
  const b = section[swapIdx];
  await updateKeyedRecord(
    BOARD_STAT_ITEM_TABLE, { id: a.id },
    { id: a.id, 모듈: '회계', 항목명: a.항목명, 정렬순서: String(b.정렬순서), 시설: a.시설, 구분: a.구분, 그룹: a.그룹 }
  );
  await updateKeyedRecord(
    BOARD_STAT_ITEM_TABLE, { id: b.id },
    { id: b.id, 모듈: '회계', 항목명: b.항목명, 정렬순서: String(a.정렬순서), 시설: b.시설, 구분: b.구분, 그룹: b.그룹 }
  );
}

function prevYm(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 전월이월 추천값: 전월 자료가 있으면 전월 잔액(전월이월+수입계-지출계, 원본 서식의 "잔액"과 동일한
// 계산식)을 그대로 이번 달 전월이월 추천값으로 준다. 전월 자료가 아예 없으면(최초 입력월) null —
// 화면에서 빈 칸으로 두고 사용자가 직접 입력하게 한다. 그대로 확정하지 않고 "추천값"만 주는 이유는
// 언제든 사용자가 고쳐 쓸 수 있어야 해서다(업무보고 항목 placeholder와 같은 결).
export function suggestCarryForward(items: AccountingItem[], values: BoardStatValue[], 시설: string, ym: string): number | null {
  const py = prevYm(ym);
  const hasPrevData = values.some((v) => v.시설 === 시설 && v.년월 === py);
  if (!hasPrevData) return null;

  let prevIncome = 0;
  let prevExpense = 0;
  let prevCarry = 0;
  for (const item of items.filter((i) => i.시설 === 시설)) {
    const v = valueFor(values, item.id, 시설, py);
    if (isCarryForwardItem(item.항목명)) prevCarry = v;
    else if (item.구분 === '수입') prevIncome += v;
    else prevExpense += v;
  }
  return prevCarry + prevIncome - prevExpense;
}

// 상단 요약표(시설별 전월잔액/금월수입/금월지출/잔액)용 — 저장된 값이 있으면 그 값을,
// 없으면(전월이월만) 추천값을 그대로 써서 계산한다. 화면의 개별 입력값 미리보기와 항상 같은 결과가 나오게
// suggestCarryForward와 동일한 계산식을 쓴다.
export function computeFacilityTotals(
  items: AccountingItem[], values: BoardStatValue[], 시설: string, ym: string
): { 전월잔액: number; 금월수입: number; 금월지출: number; 잔액: number } {
  const facilityItems = items.filter((i) => i.시설 === 시설);
  const carryItem = facilityItems.find((i) => isCarryForwardItem(i.항목명));
  const storedCarry = carryItem ? valueFor(values, carryItem.id, 시설, ym) : 0;
  const suggested = suggestCarryForward(items, values, 시설, ym);
  const 전월잔액 = storedCarry || suggested || 0;

  let 금월수입 = 0;
  let 금월지출 = 0;
  for (const item of facilityItems) {
    if (isCarryForwardItem(item.항목명)) continue;
    const v = valueFor(values, item.id, 시설, ym);
    if (item.구분 === '수입') 금월수입 += v;
    else 금월지출 += v;
  }
  return { 전월잔액, 금월수입, 금월지출, 잔액: 전월잔액 + 금월수입 - 금월지출 };
}
