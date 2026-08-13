import { getReportPeriod, type BoardPlanEntry, type BoardReportType } from '@/lib/mutate/boardPlan';
import { setReportPeriodAction } from '@/app/(portal)/business-summary/boardPlanActions';
import BoardReportTableClient from './BoardReportTableClient';
import { btnSecondary, card, inputBase } from '@/lib/ui';

export default async function BoardReportSection({
  index,
  구분,
  entries,
}: {
  index: number;
  구분: BoardReportType;
  entries: BoardPlanEntry[];
}) {
  const period = await getReportPeriod(구분);
  const columnLabel = 구분 === '사업보고' ? '성과' : '기대효과';

  return (
    <div className={card}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-[13px] font-bold text-brand-dark dark:text-brand">{index}. {구분}</h2>
        <form action={setReportPeriodAction} className="flex items-center gap-1.5">
          <input type="hidden" name="구분" value={구분} />
          <span className="text-xs text-zinc-400">(</span>
          <input
            name="기간텍스트" defaultValue={period} placeholder="예: 2026. 6. 4. ~ 2026. 8. 5."
            className={`${inputBase} w-64`}
          />
          <span className="text-xs text-zinc-400">)</span>
          <button type="submit" className={btnSecondary}>기간 저장</button>
        </form>
      </div>
      <BoardReportTableClient 구분={구분} columnLabel={columnLabel} initialRows={entries} />
    </div>
  );
}
