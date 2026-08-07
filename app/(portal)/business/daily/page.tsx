import { buildWorklogItems, getBusinessSettings, getViewerWorklogBusinessNames } from '@/lib/mutate/businessPlan';
import { dayValue, getDailyEntries, getMemo, rangeSum } from '@/lib/mutate/worklogEntry';
import { hasPageAccess } from '@/lib/mutate/permissions';
import { btn, inputBase, label } from '@/lib/ui';
import DailyEntryClient from '@/components/business/DailyEntryClient';
import FormToggle from '@/components/FormToggle';
import PageAccessDenied from '@/components/PageAccessDenied';
import { saveWorklogSettingsAction } from '../actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}
function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default async function BusinessDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; date?: string }>;
}) {
  if (!(await hasPageAccess('business-daily'))) return <PageAccessDenied />;

  const { business: businessParam, date: dateParam } = await searchParams;
  const businesses = await getViewerWorklogBusinessNames();
  const business = businessParam || businesses[0] || '';
  if (!business || !businesses.includes(business)) {
    return <p className="text-sm text-zinc-500">공유받은 사업이 없습니다. 세부사업계획 화면에서 사업 담당자에게 공유를 요청해주세요.</p>;
  }
  const date = dateParam || todayKst();

  const [settings, items, entries, memo] = await Promise.all([
    getBusinessSettings(business),
    buildWorklogItems(business),
    getDailyEntries(business),
    getMemo(business, date),
  ]);

  const monthFrom = `${date.slice(0, 7)}-01`;
  const yearFrom = `${date.slice(0, 4)}-01-01`;

  const rows = items.map((i) => ({
    id: i.id, 세부사업명: i.세부사업명, 중분류: i.중분류, 소분류: i.소분류,
    목표건: i.목표건, 목표명: i.목표명,
    day: dayValue(entries, i.id, date),
    mtd: rangeSum(entries, [i.id], monthFrom, date),
    ytd: rangeSum(entries, [i.id], yearFrom, date),
  }));

  const allIds = items.map((i) => i.id);
  const totalDay = rangeSum(entries, allIds, date, date);
  const totalMtd = rangeSum(entries, allIds, monthFrom, date);
  const totalYtd = rangeSum(entries, allIds, yearFrom, date);

  const settingsToggle = (
    <FormToggle
      label={`${business} · 총괄업무일지 설정`}
      buttonLabel="총괄업무일지 설정"
      buttonClassName="text-[11px] text-brand hover:underline"
      wrapperClassName=""
    >
      <form action={saveWorklogSettingsAction} className="flex flex-col gap-3">
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
        <button type="submit" className={`${btn} w-fit`}>저장</button>
      </form>
    </FormToggle>
  );

  return (
    <DailyEntryClient
      business={business}
      date={date}
      prevDate={addDays(date, -1)}
      nextDate={addDays(date, 1)}
      dow={DOW[new Date(`${date}T00:00:00`).getDay()]}
      actLabel={settings.활동내용라벨}
      rows={rows}
      grandGoal={settings.총목표}
      totalDay={totalDay}
      totalMtd={totalMtd}
      totalYtd={totalYtd}
      initialContent={memo?.활동내용 ?? ''}
      initialNote={memo?.특이사항 ?? ''}
      settingsToggle={settingsToggle}
    />
  );
}
