import { buildWorklogItems, getBusinessPlanTree, getBusinessSettings, getWorklogBusinessNames } from '@/lib/mutate/businessPlan';
import { getAllBusinessShares } from '@/lib/mutate/businessShare';
import { getShareableStaffGroups, hasPageAccess } from '@/lib/mutate/permissions';
import { btn, card, h2, hint, inputBase, label } from '@/lib/ui';
import BusinessPlanEditor from '@/components/business/BusinessPlanEditor';
import ShareStaffChecklist from '@/components/business/ShareStaffChecklist';
import FormToggle from '@/components/FormToggle';
import PageAccessDenied from '@/components/PageAccessDenied';
import { saveWorklogBusinessSettingsAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nf = (n: number) => (n || 0).toLocaleString('ko-KR');
const th = 'border border-[#c7ccd3] bg-[#eef1f5] px-2 py-2 text-center text-[11.5px] font-bold text-zinc-600 whitespace-nowrap dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
const td = 'border border-[#c7ccd3] px-2.5 py-2.5 align-top text-[12.5px] dark:border-zinc-700';

export default async function BusinessGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  if (!(await hasPageAccess('business-goal'))) return <PageAccessDenied />;

  const { business: businessParam } = await searchParams;
  const businesses = await getWorklogBusinessNames();
  const business = businessParam || businesses[0] || '';

  if (!business) {
    return <p className="text-sm text-zinc-500">등록된 사업이 없습니다. 위 &ldquo;새 사업 만들기&rdquo;로 만들어주세요.</p>;
  }

  const [settings, tree, worklogItems, staffGroups, sharesMap] = await Promise.all([
    getBusinessSettings(business),
    getBusinessPlanTree(business),
    buildWorklogItems(business),
    getShareableStaffGroups(),
    getAllBusinessShares(),
  ]);
  const shared = sharesMap[business] ?? [];

  const settingsToggle = (
    <FormToggle
      label={`${business} · 사업설정`}
      buttonLabel="사업설정 수정"
      buttonClassName="text-[11px] text-brand hover:underline"
      wrapperClassName=""
    >
      <form action={saveWorklogBusinessSettingsAction} className="flex flex-col gap-3">
        <input type="hidden" name="business" value={business} />
        <label className={label}>
          총목표(명)
          <input name="grandGoal" type="number" min="0" defaultValue={settings.총목표} className={inputBase} />
        </label>
        <label className={label}>
          활동내용 라벨
          <input name="actLabel" defaultValue={settings.활동내용라벨} className={inputBase} />
        </label>
        <label className={label}>
          결재라인 (쉼표로 구분)
          <input name="approvalLine" defaultValue={settings.결재라인.join(', ')} className={inputBase} />
        </label>
        <div className={label}>
          공유 대상 (업무입력·월별현황·일지인쇄 접근 허용)
          <ShareStaffChecklist groups={staffGroups} checkedEmails={shared} />
        </div>
        <button type="submit" className={`${btn} w-fit`}>저장</button>
      </form>
    </FormToggle>
  );

  return (
    <div>
      <BusinessPlanEditor
        key={business}
        business={business}
        grandGoal={settings.총목표}
        initialSubs={tree}
        settingsToggle={settingsToggle}
      />

      <div className={card}>
        <h2 className={h2}>생성된 업무일지 항목 <span className="ml-2 text-xs font-normal text-zinc-400">{worklogItems.length}개</span></h2>
        <p className={hint}>세부사업계획 표의 산출근거가 이 항목들로 파생되어 업무입력·월별현황에 그대로 쓰입니다.</p>
        <div className="overflow-x-auto rounded-md border border-[#c7ccd3] dark:border-zinc-700">
          <table className="w-full min-w-[600px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className={th}>세부사업</th>
                <th className={th}>중분류</th>
                <th className={th}>소분류</th>
                <th className={th}>목표건</th>
                <th className={th}>목표명</th>
              </tr>
            </thead>
            <tbody>
              {worklogItems.map((i) => (
                <tr key={i.id}>
                  <td className={td}>{i.세부사업명}</td>
                  <td className={td}>{i.중분류}</td>
                  <td className={td}>{i.소분류 || <span className="text-zinc-400">-</span>}</td>
                  <td className={`${td} text-right`}>{nf(i.목표건)}</td>
                  <td className={`${td} text-right`}>{nf(i.목표명)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
