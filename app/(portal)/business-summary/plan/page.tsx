import { hasPageAccess } from '@/lib/mutate/permissions';
import PageAccessDenied from '@/components/PageAccessDenied';
import FormToggle from '@/components/FormToggle';
import { getBoardPlanEntries } from '@/lib/mutate/boardPlan';
import {
  addBoardPlanEntryAction, deleteBoardPlanEntryAction, moveBoardPlanEntryAction, updateBoardPlanEntryAction,
} from '@/app/(portal)/business-summary/boardPlanActions';
import { btn, btnDanger, btnSecondary, card, input } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function EntryFields({ defaults }: { defaults?: { 사업명: string; 실시월일: string; 내용: string; 기대효과: string } }) {
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input name="사업명" placeholder="사업명" defaultValue={defaults?.사업명} required className={input} />
        <input name="실시월일" placeholder="실시월일 (예: 9/5(금))" defaultValue={defaults?.실시월일} required className={input} />
      </div>
      <textarea name="내용" placeholder="내용" defaultValue={defaults?.내용} rows={3} required className={input} />
      <textarea name="기대효과" placeholder="기대효과" defaultValue={defaults?.기대효과} rows={2} required className={input} />
    </div>
  );
}

export default async function BusinessSummaryPlanPage() {
  if (!(await hasPageAccess('business-board-plan'))) return <PageAccessDenied />;

  const items = await getBoardPlanEntries();

  return (
    <div className={card}>
      <FormToggle label="사업계획 추가" wrapperClassName="mb-4">
        <form action={addBoardPlanEntryAction} className="flex flex-col gap-3">
          <EntryFields />
          <button type="submit" className={btn}>추가</button>
        </form>
      </FormToggle>

      {items.length === 0 && <p className="text-sm text-zinc-400">등록된 사업계획이 없습니다.</p>}

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <form action={updateBoardPlanEntryAction} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={item.id} />
              <EntryFields defaults={item} />
              <div className="flex items-center gap-1.5">
                <button type="submit" className={btn}>저장</button>
                <span className="flex-1" />
                <button
                  type="submit" formAction={moveBoardPlanEntryAction} name="direction" value="up"
                  disabled={i === 0} className={`${btnSecondary} disabled:opacity-30`}
                >위</button>
                <button
                  type="submit" formAction={moveBoardPlanEntryAction} name="direction" value="down"
                  disabled={i === items.length - 1} className={`${btnSecondary} disabled:opacity-30`}
                >아래</button>
                <button type="submit" formAction={deleteBoardPlanEntryAction} className={btnDanger}>삭제</button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
