import FormToggle from '@/components/FormToggle';
import BoardStatEntryClient from '@/components/business/BoardStatEntryClient';
import { getModuleItems, getModuleValues, priorCumulative, valueFor, type BoardStatModule } from '@/lib/mutate/boardStat';
import { addBoardStatItemAction, deleteBoardStatItemAction, moveBoardStatItemAction } from '@/app/(portal)/business-summary/boardStatActions';
import { btn, btnDanger, btnSecondary, card, h2, input, inputBase } from '@/lib/ui';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BoardStatModuleView({
  모듈,
  basePath,
  ymParam,
}: {
  모듈: BoardStatModule;
  basePath: string;
  ymParam?: string;
}) {
  const ym = ymParam || todayKst().slice(0, 7);
  const items = await getModuleItems(모듈);
  const values = await getModuleValues(items.map((i) => i.id));
  const rows = items.map((i) => ({
    id: i.id,
    항목명: i.항목명,
    전월누계: priorCumulative(values, i.id, ym),
    금월실적: valueFor(values, i.id, ym),
  }));

  return (
    <>
      <form method="get" action={basePath} className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <div className={`${card} mb-5`}>
        <h2 className={`${h2} mb-3`}>항목 관리</h2>
        <FormToggle label="항목 추가" wrapperClassName="mb-3">
          <form action={addBoardStatItemAction} className="flex gap-2">
            <input type="hidden" name="모듈" value={모듈} />
            <input name="항목명" placeholder="추가할 항목명" required className={input} />
            <button type="submit" className={btn}>추가</button>
          </form>
        </FormToggle>
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-1.5 text-sm">
              <span className="flex-1 text-zinc-800 dark:text-zinc-200">{item.항목명}</span>
              <form action={moveBoardStatItemAction}>
                <input type="hidden" name="모듈" value={모듈} />
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="direction" value="up" />
                <button type="submit" disabled={i === 0} className={`${btnSecondary} disabled:opacity-30`}>위</button>
              </form>
              <form action={moveBoardStatItemAction}>
                <input type="hidden" name="모듈" value={모듈} />
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="direction" value="down" />
                <button type="submit" disabled={i === items.length - 1} className={`${btnSecondary} disabled:opacity-30`}>아래</button>
              </form>
              <form action={deleteBoardStatItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className={btnDanger}>삭제</button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      <div className={card}>
        <h2 className={`${h2} mb-3`}>{ym} 값 입력</h2>
        <BoardStatEntryClient ym={ym} rows={rows} />
      </div>
    </>
  );
}
