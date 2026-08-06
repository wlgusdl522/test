import { getWorklogBusinessNames } from '@/lib/mutate/businessPlan';
import { getShareableStaffGroups } from '@/lib/mutate/permissions';
import { btn, h1, input, label, pageFluid } from '@/lib/ui';
import BusinessTabsClient from '@/components/business/BusinessTabsClient';
import ShareStaffChecklist from '@/components/business/ShareStaffChecklist';
import FormToggle from '@/components/FormToggle';
import { createWorklogBusinessAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 총괄업무일지는 설정 > 사업목록을 참조하지 않고 자체 사업 목록(사업설정 행)을 쓴다.
// 목표설정(계획서)은 전 직원이 같이 보는 문서라 사업 목록을 거르지 않고 그대로 보여준다.
// 실적을 다루는 일계입력/월별현황/일지인쇄는 각 페이지에서 공유 대상 기준으로 따로 제한한다.
export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const [names, staffGroups] = await Promise.all([getWorklogBusinessNames(), getShareableStaffGroups()]);

  return (
    <main className={pageFluid}>
      <div className="mb-2 flex items-center justify-between">
        <h1 className={h1}>사업관리</h1>
        <FormToggle label="새 사업 만들기">
          <form action={createWorklogBusinessAction} className="flex flex-col gap-3">
            <label className={label}>
              사업명
              <input name="name" required className={input} />
            </label>
            <div className={label}>
              공유 대상 (이 사업의 총괄업무일지 - 업무입력·월별현황·일지인쇄를 볼 수 있는 직원)
              <ShareStaffChecklist groups={staffGroups} />
            </div>
            <button type="submit" className={`${btn} w-fit`}>만들기</button>
          </form>
        </FormToggle>
      </div>
      <BusinessTabsClient businesses={names} />
      {children}
    </main>
  );
}
