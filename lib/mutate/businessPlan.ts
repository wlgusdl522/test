import { randomUUID } from 'crypto';
import { isAdminEmail, requireViewerEmail } from '@/lib/auth-helpers';
import { getBusinessNamesSharedWith, setBusinessShares } from '@/lib/mutate/businessShare';
import { addKeyedRecord, deleteKeyedRecord, getKeyedList, updateKeyedRecord, upsertKeyedRecord } from '@/lib/mutate/keyedTable';
import {
  BUSINESS_PLAN_BASIS_TABLE,
  BUSINESS_PLAN_ITEM_TABLE,
  BUSINESS_SETTINGS_TABLE,
  BUSINESS_SUB_TABLE,
} from '@/lib/sheets/registry';

export const DEFAULT_APPROVAL_LINE = ['담당', '과장', '부장', '관장'];

export const ACTIVITY_LABEL = '활동내용';

export type BusinessSettings = { 결재라인: string[] };

export type BasisRow = {
  id: string; 계획항목ID: string; 라벨: string; 직접입력여부: boolean;
  인원: number; 횟수: number; 단위: string; 직접건: number; 직접명: number; 정렬순서: number;
};

export type PlanItem = {
  id: string; 세부사업ID: string; 제목: string; 표기방식: 'merge' | 'sub' | 'mid';
  예산: number; 사업내용: string; 정렬순서: number; basis: BasisRow[];
};

export type BusinessSubNode = {
  id: string; 사업명: string; 세부사업명: string; 기대효과: string; 정렬순서: number; plans: PlanItem[];
};

export type WorklogItem = {
  id: string; 세부사업ID: string; 세부사업명: string; 계획항목ID: string;
  중분류: string; 소분류: string; 목표건: number; 목표명: number;
};

function num(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function bySort<T extends { 정렬순서: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.정렬순서 - b.정렬순서);
}

// ── 사업설정 ──────────────────────────────────────────────────────
export async function getBusinessSettings(사업명: string): Promise<BusinessSettings> {
  const list = await getKeyedList(BUSINESS_SETTINGS_TABLE);
  const row = list.find((r) => r.사업명 === 사업명);
  let 결재라인: string[] = [];
  try {
    결재라인 = JSON.parse(row?.결재라인JSON || '[]');
  } catch {
    결재라인 = [];
  }
  return {
    결재라인: 결재라인.length ? 결재라인 : DEFAULT_APPROVAL_LINE,
  };
}

// 설정 > 사업목록에서 사업별 결재라인을 한 번에 보여줄 때 쓴다
// (사업 수만큼 getBusinessSettings를 반복 호출하면 시트를 그만큼 다시 읽어오게 되어 비효율적).
export async function getAllBusinessSettings(): Promise<Record<string, BusinessSettings>> {
  const list = await getKeyedList(BUSINESS_SETTINGS_TABLE);
  const map: Record<string, BusinessSettings> = {};
  list.forEach((row) => {
    let 결재라인: string[] = [];
    try {
      결재라인 = JSON.parse(row.결재라인JSON || '[]');
    } catch {
      결재라인 = [];
    }
    map[row.사업명] = {
      결재라인: 결재라인.length ? 결재라인 : DEFAULT_APPROVAL_LINE,
    };
  });
  return map;
}

export async function upsertBusinessSettings(
  사업명: string,
  patch: Partial<BusinessSettings>
): Promise<void> {
  const current = await getBusinessSettings(사업명);
  const merged: BusinessSettings = { ...current, ...patch };
  const list = await getKeyedList(BUSINESS_SETTINGS_TABLE);
  const existing = list.find((r) => r.사업명 === 사업명);
  await upsertKeyedRecord(BUSINESS_SETTINGS_TABLE, { 사업명 }, {
    id: existing?.id || randomUUID(),
    사업명,
    결재라인JSON: JSON.stringify(merged.결재라인),
    정렬순서: existing?.정렬순서 || String(await nextBusinessOrder()),
  });
}

async function nextBusinessOrder(): Promise<number> {
  const list = await getKeyedList(BUSINESS_SETTINGS_TABLE);
  return Math.max(0, ...list.map((r) => num(r.정렬순서))) + 1;
}

// 총괄업무일지는 설정 > 사업목록(예산과목·담당사업 등 다른 기능도 같이 쓰는 범용 목록)을
// 더 이상 참조하지 않고, "사업설정" 행 자체가 곧 "총괄업무일지에 등록된 사업"이 된다.
// 새 사업은 목표설정 화면에서 이름 + 공유 대상을 같이 입력해서 바로 만든다.
export async function getWorklogBusinessNames(): Promise<string[]> {
  const list = await getKeyedList(BUSINESS_SETTINGS_TABLE);
  return [...list]
    .filter((r) => r.사업명)
    .sort((a, b) => num(a.정렬순서) - num(b.정렬순서))
    .map((r) => r.사업명);
}

// 탭에 표시되는 사업 순서를 앞/뒤로 한 칸 바꾼다 — 정렬순서 값을 이웃 사업과 맞바꾼다.
export async function moveWorklogBusiness(사업명: string, direction: 'up' | 'down'): Promise<void> {
  const list = await getKeyedList(BUSINESS_SETTINGS_TABLE);
  const ordered = [...list].filter((r) => r.사업명).sort((a, b) => num(a.정렬순서) - num(b.정렬순서));
  const idx = ordered.findIndex((r) => r.사업명 === 사업명);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
  const a = ordered[idx];
  const b = ordered[swapIdx];
  await updateKeyedRecord(BUSINESS_SETTINGS_TABLE, { 사업명: a.사업명 }, { ...a, 정렬순서: String(num(b.정렬순서)) });
  await updateKeyedRecord(BUSINESS_SETTINGS_TABLE, { 사업명: b.사업명 }, { ...b, 정렬순서: String(num(a.정렬순서)) });
}

// 목표설정(계획서)은 전 직원이 같이 보지만, 일계입력/월별현황/일지인쇄는 이 사업을 공유받은
// 사람만 볼 수 있다 — 관리자는 예외로 전체 열람.
export async function getViewerWorklogBusinessNames(): Promise<string[]> {
  const email = await requireViewerEmail();
  const all = await getWorklogBusinessNames();
  if (await isAdminEmail(email)) return all;
  const shared = new Set(await getBusinessNamesSharedWith(email));
  return all.filter((name) => shared.has(name));
}

export async function createWorklogBusiness(
  사업명: string,
  shareEmails: string[],
  staffByEmail: Map<string, string>
): Promise<void> {
  const trimmed = 사업명.trim();
  if (!trimmed) throw new Error('사업명을 입력해주세요.');
  const existing = await getWorklogBusinessNames();
  if (existing.includes(trimmed)) throw new Error('이미 등록된 사업명입니다.');
  await upsertBusinessSettings(trimmed, { 결재라인: DEFAULT_APPROVAL_LINE });
  await setBusinessShares(trimmed, shareEmails, staffByEmail);
}

// ── 세부사업 / 계획항목 / 산출근거 조회 (계획서 트리 전체) ──────────────
export async function getBusinessPlanTree(사업명: string): Promise<BusinessSubNode[]> {
  const [subs, items, basisRows] = await Promise.all([
    getKeyedList(BUSINESS_SUB_TABLE),
    getKeyedList(BUSINESS_PLAN_ITEM_TABLE),
    getKeyedList(BUSINESS_PLAN_BASIS_TABLE),
  ]);
  const mySubs = bySort(
    subs.filter((s) => s.사업명 === 사업명).map((s) => ({
      id: s.id, 사업명: s.사업명, 세부사업명: s.세부사업명, 기대효과: s.기대효과, 정렬순서: num(s.정렬순서),
    }))
  );
  return mySubs.map((s) => {
    const plans = bySort(
      items.filter((i) => i.세부사업ID === s.id).map((i) => ({
        id: i.id,
        세부사업ID: i.세부사업ID,
        제목: i.제목,
        표기방식: (i.표기방식 as PlanItem['표기방식']) || 'merge',
        예산: num(i.예산),
        사업내용: i.사업내용,
        정렬순서: num(i.정렬순서),
        basis: bySort(
          basisRows.filter((b) => b.계획항목ID === i.id).map((b) => ({
            id: b.id, 계획항목ID: b.계획항목ID, 라벨: b.라벨,
            직접입력여부: b.직접입력여부 === 'Y',
            인원: num(b.인원), 횟수: num(b.횟수), 단위: b.단위 || '회',
            직접건: num(b.직접건), 직접명: num(b.직접명), 정렬순서: num(b.정렬순서),
          }))
        ),
      }))
    );
    return { ...s, plans };
  });
}

// ── 세부사업 CRUD ─────────────────────────────────────────────────
// 시안(HTML)의 addSub()와 동일하게: 이름을 미리 받지 않고 바로 "새 세부사업" 한 줄을 만들고
// 그 안에 기본 계획항목·산출근거까지 같이 생성한다. 이름/내용은 생성된 행에서 바로 고쳐 쓴다.
export async function addBusinessSub(사업명: string): Promise<void> {
  const subs = await getKeyedList(BUSINESS_SUB_TABLE);
  const nextOrder = Math.max(0, ...subs.filter((s) => s.사업명 === 사업명).map((s) => num(s.정렬순서))) + 1;
  const subId = randomUUID();
  await addKeyedRecord(BUSINESS_SUB_TABLE, {
    id: subId, 사업명, 세부사업명: '새 세부사업', 기대효과: '', 정렬순서: String(nextOrder),
  });
  await addPlanItem(subId, '새 계획항목');
}

export async function updateBusinessSub(id: string, patch: { 세부사업명?: string; 기대효과?: string }): Promise<void> {
  const subs = await getKeyedList(BUSINESS_SUB_TABLE);
  const existing = subs.find((s) => s.id === id);
  if (!existing) throw new Error('세부사업을 찾을 수 없습니다.');
  await updateKeyedRecord(BUSINESS_SUB_TABLE, { id }, { ...existing, ...patch });
}

export async function deleteBusinessSub(id: string): Promise<void> {
  const items = await getKeyedList(BUSINESS_PLAN_ITEM_TABLE);
  const basisRows = await getKeyedList(BUSINESS_PLAN_BASIS_TABLE);
  const childItemIds = items.filter((i) => i.세부사업ID === id).map((i) => i.id);
  for (const b of basisRows.filter((row) => childItemIds.includes(row.계획항목ID))) {
    await deleteKeyedRecord(BUSINESS_PLAN_BASIS_TABLE, { id: b.id });
  }
  for (const itemId of childItemIds) {
    await deleteKeyedRecord(BUSINESS_PLAN_ITEM_TABLE, { id: itemId });
  }
  await deleteKeyedRecord(BUSINESS_SUB_TABLE, { id });
}

// ── 계획항목 CRUD ─────────────────────────────────────────────────
export async function addPlanItem(세부사업ID: string, 제목: string): Promise<void> {
  const items = await getKeyedList(BUSINESS_PLAN_ITEM_TABLE);
  const nextOrder = Math.max(0, ...items.filter((i) => i.세부사업ID === 세부사업ID).map((i) => num(i.정렬순서))) + 1;
  const itemId = randomUUID();
  await addKeyedRecord(BUSINESS_PLAN_ITEM_TABLE, {
    id: itemId, 세부사업ID, 제목: 제목.trim() || '새 계획항목', 표기방식: 'merge',
    예산: '0', 사업내용: '', 정렬순서: String(nextOrder),
  });
  await addKeyedRecord(BUSINESS_PLAN_BASIS_TABLE, {
    id: randomUUID(), 계획항목ID: itemId, 라벨: '새 항목', 직접입력여부: 'N',
    인원: '0', 횟수: '0', 단위: '회', 직접건: '0', 직접명: '0', 정렬순서: '1',
  });
}

export async function updatePlanItem(
  id: string,
  patch: Partial<{ 제목: string; 표기방식: string; 예산: number; 사업내용: string }>
): Promise<void> {
  const items = await getKeyedList(BUSINESS_PLAN_ITEM_TABLE);
  const existing = items.find((i) => i.id === id);
  if (!existing) throw new Error('계획항목을 찾을 수 없습니다.');
  await updateKeyedRecord(BUSINESS_PLAN_ITEM_TABLE, { id }, {
    ...existing,
    ...patch,
    예산: patch.예산 !== undefined ? String(patch.예산) : existing.예산,
  });
}

export async function deletePlanItem(id: string): Promise<void> {
  const items = await getKeyedList(BUSINESS_PLAN_ITEM_TABLE);
  const existing = items.find((i) => i.id === id);
  if (!existing) return;
  const siblings = items.filter((i) => i.세부사업ID === existing.세부사업ID);
  if (siblings.length <= 1) throw new Error('세부사업에는 계획항목이 최소 1개 있어야 합니다.');
  const basisRows = await getKeyedList(BUSINESS_PLAN_BASIS_TABLE);
  for (const b of basisRows.filter((row) => row.계획항목ID === id)) {
    await deleteKeyedRecord(BUSINESS_PLAN_BASIS_TABLE, { id: b.id });
  }
  await deleteKeyedRecord(BUSINESS_PLAN_ITEM_TABLE, { id });
}

// ── 산출근거 CRUD ─────────────────────────────────────────────────
export async function addBasis(계획항목ID: string, direct: boolean): Promise<void> {
  const rows = await getKeyedList(BUSINESS_PLAN_BASIS_TABLE);
  const siblings = rows.filter((r) => r.계획항목ID === 계획항목ID);
  const nextOrder = Math.max(0, ...siblings.map((r) => num(r.정렬순서))) + 1;
  await addKeyedRecord(BUSINESS_PLAN_BASIS_TABLE, {
    id: randomUUID(), 계획항목ID, 라벨: '새 항목', 직접입력여부: direct ? 'Y' : 'N',
    인원: '0', 횟수: '0', 단위: '회', 직접건: '0', 직접명: '0', 정렬순서: String(nextOrder),
  });
  // 산출근거가 2줄 이상이 되면 병합(merge) 표기는 더 이상 말이 안 되므로 소분류 분리로 바꿔준다.
  if (siblings.length >= 1) {
    const items = await getKeyedList(BUSINESS_PLAN_ITEM_TABLE);
    const plan = items.find((i) => i.id === 계획항목ID);
    if (plan?.표기방식 === 'merge') {
      await updateKeyedRecord(BUSINESS_PLAN_ITEM_TABLE, { id: 계획항목ID }, { ...plan, 표기방식: 'sub' });
    }
  }
}

export async function updateBasis(
  id: string,
  patch: Partial<{ 라벨: string; 직접입력여부: boolean; 인원: number; 횟수: number; 단위: string; 직접건: number; 직접명: number }>
): Promise<void> {
  const rows = await getKeyedList(BUSINESS_PLAN_BASIS_TABLE);
  const existing = rows.find((r) => r.id === id);
  if (!existing) throw new Error('산출근거를 찾을 수 없습니다.');
  const record: Record<string, string> = { ...existing };
  if (patch.라벨 !== undefined) record.라벨 = patch.라벨;
  if (patch.직접입력여부 !== undefined) record.직접입력여부 = patch.직접입력여부 ? 'Y' : 'N';
  if (patch.인원 !== undefined) record.인원 = String(patch.인원);
  if (patch.횟수 !== undefined) record.횟수 = String(patch.횟수);
  if (patch.단위 !== undefined) record.단위 = patch.단위;
  if (patch.직접건 !== undefined) record.직접건 = String(patch.직접건);
  if (patch.직접명 !== undefined) record.직접명 = String(patch.직접명);
  await updateKeyedRecord(BUSINESS_PLAN_BASIS_TABLE, { id }, record);
}

export async function deleteBasis(id: string): Promise<void> {
  const rows = await getKeyedList(BUSINESS_PLAN_BASIS_TABLE);
  const existing = rows.find((r) => r.id === id);
  if (!existing) return;
  const siblings = rows.filter((r) => r.계획항목ID === existing.계획항목ID);
  if (siblings.length <= 1) throw new Error('계획항목에는 산출근거가 최소 1줄 있어야 합니다.');
  await deleteKeyedRecord(BUSINESS_PLAN_BASIS_TABLE, { id });
}

// ── 업무일지 항목 파생 (시안의 buildItems 포팅) ────────────────────
// merge: 산출근거 여러 줄을 한 항목으로 묶어 표시(목표건=최댓값, 목표명=합계).
// sub: 계획항목 제목을 중분류로, 산출근거 라벨을 소분류로 나눠 표시.
// mid: 산출근거 라벨 자체를 중분류로 승격해 표시(소분류 없음).
function lineGoal(x: BasisRow): [number, number] {
  return x.직접입력여부 ? [x.직접건, x.직접명] : [x.횟수, x.인원 * x.횟수];
}

function itemsForPlan(sub: BusinessSubNode, plan: PlanItem): WorklogItem[] {
  if (plan.basis.length === 0) return [];
  if (plan.표기방식 === 'merge') {
    let gc = 0;
    let gp = 0;
    plan.basis.forEach((x) => {
      const [c, p] = lineGoal(x);
      gc = Math.max(gc, c);
      gp += p;
    });
    return [{
      id: plan.id, 세부사업ID: sub.id, 세부사업명: sub.세부사업명, 계획항목ID: plan.id,
      중분류: plan.제목, 소분류: '', 목표건: gc, 목표명: gp,
    }];
  }
  return plan.basis.map((x) => {
    const [gc, gp] = lineGoal(x);
    return {
      id: `${plan.id}-${x.id}`, 세부사업ID: sub.id, 세부사업명: sub.세부사업명, 계획항목ID: plan.id,
      중분류: plan.표기방식 === 'mid' ? x.라벨 : plan.제목,
      소분류: plan.표기방식 === 'mid' ? '' : x.라벨,
      목표건: gc, 목표명: gp,
    };
  });
}

export async function buildWorklogItems(사업명: string): Promise<WorklogItem[]> {
  const tree = await getBusinessPlanTree(사업명);
  return tree.flatMap((sub) => sub.plans.flatMap((plan) => itemsForPlan(sub, plan)));
}

// 총목표는 별도로 입력받지 않고, 세부사업계획에 마지막으로 저장된 산출근거 목표를 그대로 합산한 값이다.
export function sumWorklogGoal(items: WorklogItem[]): number {
  return items.reduce((a, i) => a + i.목표명, 0);
}

// 계획서 화면에서 계획항목 하나의 "목표(건/명)" 합계를 보여주기 위한 헬퍼 —
// itemsForPlan이 만드는 파생 항목들을 그대로 합산한다(merge는 항목 1개, sub/mid는 여러 개).
export function planGoal(sub: Pick<BusinessSubNode, 'id' | '세부사업명'>, plan: PlanItem): { gc: number; gp: number } {
  const items = itemsForPlan(sub as BusinessSubNode, plan);
  return items.reduce((acc, i) => ({ gc: acc.gc + i.목표건, gp: acc.gp + i.목표명 }), { gc: 0, gp: 0 });
}
