'use server';

import { revalidatePath } from 'next/cache';
import {
  addBasis,
  addBusinessSub,
  addPlanItem,
  createWorklogBusiness,
  deleteBasis,
  deleteBusinessSub,
  deletePlanItem,
  moveWorklogBusiness,
  updateBasis,
  updateBusinessSub,
  updatePlanItem,
  upsertBusinessSettings,
  type BusinessSubNode,
} from '@/lib/mutate/businessPlan';
import { setBusinessShares } from '@/lib/mutate/businessShare';
import { getActiveStaffList } from '@/lib/mutate/permissions';

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '');
}
function numOrZero(formData: FormData, key: string): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : 0;
}
async function staffByEmailMap(): Promise<Map<string, string>> {
  const staff = await getActiveStaffList();
  return new Map(staff.map((s) => [s.email.toLowerCase(), s.name]));
}

export async function createWorklogBusinessAction(formData: FormData): Promise<void> {
  const shareEmails = formData.getAll('shareEmails').map((v) => String(v));
  await createWorklogBusiness(str(formData, 'name'), shareEmails, await staffByEmailMap());
  revalidatePath('/business');
}

export async function moveBusinessAction(formData: FormData): Promise<void> {
  await moveWorklogBusiness(str(formData, 'business'), str(formData, 'direction') === 'down' ? 'down' : 'up');
  revalidatePath('/business');
  revalidatePath('/business/daily');
  revalidatePath('/business/monthly');
}

// 목표설정(세부사업계획)은 전 직원 공개라 사업공유 설정이 필요 없고, 사업공유는 오직
// 업무입력·월별현황·일지인쇄(총괄업무일지)의 접근 범위를 정하는 값이라 그 설정 폼 안에 같이 둔다.
export async function saveWorklogSettingsAction(formData: FormData): Promise<void> {
  const 사업명 = str(formData, 'business');
  const 결재라인 = str(formData, 'approvalLine').split(',').map((s) => s.trim()).filter(Boolean);
  const shareEmails = formData.getAll('shareEmails').map((v) => String(v));
  await upsertBusinessSettings(사업명, {
    총목표: numOrZero(formData, 'grandGoal'),
    활동내용라벨: str(formData, 'actLabel').trim() || '활동내용',
    결재라인,
  });
  await setBusinessShares(사업명, shareEmails, await staffByEmailMap());
  revalidatePath('/business');
  revalidatePath('/business/daily');
  revalidatePath('/business/monthly');
}

// 세부사업계획 표 전체를 편집 중엔 로컬 state로만 들고 있다가, 이 액션 한 번으로 바뀐 값을
// 전부 저장한다 — 칸마다 따로 있던 저장 버튼을 하나로 합치기 위한 일괄 저장.
export async function saveBusinessPlanAction(subs: BusinessSubNode[]): Promise<void> {
  for (const s of subs) {
    await updateBusinessSub(s.id, { 세부사업명: s.세부사업명, 기대효과: s.기대효과 });
    for (const p of s.plans) {
      await updatePlanItem(p.id, { 제목: p.제목, 표기방식: p.표기방식, 예산: p.예산, 사업내용: p.사업내용 });
      for (const b of p.basis) {
        await updateBasis(b.id, {
          라벨: b.라벨, 직접입력여부: b.직접입력여부, 인원: b.인원, 횟수: b.횟수, 단위: b.단위, 직접건: b.직접건, 직접명: b.직접명,
        });
      }
    }
  }
  revalidatePath('/business');
}

export async function addSubAction(formData: FormData): Promise<void> {
  await addBusinessSub(str(formData, 'business'));
  revalidatePath('/business');
}

export async function updateSubAction(formData: FormData): Promise<void> {
  await updateBusinessSub(str(formData, 'id'), { 세부사업명: str(formData, 'name'), 기대효과: str(formData, 'effect') });
  revalidatePath('/business');
}

export async function deleteSubAction(formData: FormData): Promise<void> {
  await deleteBusinessSub(str(formData, 'id'));
  revalidatePath('/business');
}

export async function addPlanAction(formData: FormData): Promise<void> {
  await addPlanItem(str(formData, 'subId'), str(formData, 'title'));
  revalidatePath('/business');
}

export async function updatePlanAction(formData: FormData): Promise<void> {
  await updatePlanItem(str(formData, 'id'), {
    제목: str(formData, 'title'),
    표기방식: str(formData, 'mode'),
    예산: numOrZero(formData, 'budget'),
    사업내용: str(formData, 'content'),
  });
  revalidatePath('/business');
}

export async function deletePlanAction(formData: FormData): Promise<void> {
  await deletePlanItem(str(formData, 'id'));
  revalidatePath('/business');
}

export async function addBasisAction(formData: FormData): Promise<void> {
  await addBasis(str(formData, 'planId'), str(formData, 'direct') === '1');
  revalidatePath('/business');
}

export async function updateBasisAction(formData: FormData): Promise<void> {
  await updateBasis(str(formData, 'id'), {
    라벨: str(formData, 'label'),
    직접입력여부: str(formData, 'direct') === 'on',
    인원: numOrZero(formData, 'per'),
    횟수: numOrZero(formData, 'times'),
    단위: str(formData, 'unit') || '회',
    직접건: numOrZero(formData, 'gc'),
    직접명: numOrZero(formData, 'gp'),
  });
  revalidatePath('/business');
}

export async function deleteBasisAction(formData: FormData): Promise<void> {
  await deleteBasis(str(formData, 'id'));
  revalidatePath('/business');
}
