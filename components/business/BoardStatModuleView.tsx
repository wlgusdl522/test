import FormToggle from '@/components/FormToggle';
import BoardStatEntryClient from '@/components/business/BoardStatEntryClient';
import BoardRosterTableClient from '@/components/business/BoardRosterTableClient';
import { facilitiesFor, getModuleItems, getModuleValues, priorCumulative, valueFor, NO_FACILITY, type BoardStatModule } from '@/lib/mutate/boardStat';
import { getRosterByItems } from '@/lib/mutate/boardRoster';
import { addBoardStatItemAction, deleteBoardStatItemAction, moveBoardStatItemAction } from '@/app/(portal)/business-summary/boardStatActions';
import { btn, btnDanger, btnSecondary, card, h2, input, inputBase } from '@/lib/ui';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function BoardStatModuleView({
  모듈,
  basePath,
  ymParam,
  facilityParam,
}: {
  모듈: BoardStatModule;
  basePath: string;
  ymParam?: string;
  facilityParam?: string;
}) {
  const ym = ymParam || todayKst().slice(0, 7);
  const facilities = facilitiesFor(모듈);
  const 시설 = facilities.includes(facilityParam ?? '') ? (facilityParam as string) : facilities[0];
  const items = await getModuleItems(모듈);
  const values = await getModuleValues(items.map((i) => i.id));
  const showRoster = 모듈 === '자원봉사자';
  const roster = showRoster ? await getRosterByItems(items.map((i) => i.id), ym) : [];
  const rows = items.map((i) => ({
    id: i.id,
    항목명: i.항목명,
    전월누계: priorCumulative(values, i.id, 시설, ym),
    금월실적: valueFor(values, i.id, 시설, ym),
  }));

  return (
    <>
      <form method="get" action={basePath} className="mb-4 flex flex-wrap items-center gap-3">
        {시설 !== NO_FACILITY && (
          <>
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">시설</label>
            <select name="facility" defaultValue={시설} className={`${inputBase} w-auto`}>
              {facilities.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </>
        )}
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">조회월</label>
        <input type="month" name="ym" defaultValue={ym} className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <FormToggle label="항목 관리" buttonLabel="항목 관리" wrapperClassName="mb-5">
        <div className="flex flex-col gap-4">
          <form action={addBoardStatItemAction} className="flex gap-2">
            <input type="hidden" name="모듈" value={모듈} />
            <input name="항목명" placeholder="추가할 항목명" required className={input} />
            <button type="submit" className={btn}>추가</button>
          </form>
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
      </FormToggle>

      <div className={`${card} mb-5`}>
        <h2 className={`${h2} mb-3`}>{시설 !== NO_FACILITY ? `${시설} · ` : ''}{ym} 값 입력</h2>
        <BoardStatEntryClient 시설={시설} ym={ym} rows={rows} />
      </div>

      {showRoster && (
        <div className={card}>
          <h2 className={`${h2} mb-3`}>{ym} 명단 입력</h2>
          <BoardRosterTableClient
            items={items.map((i) => ({ id: i.id, 항목명: i.항목명 }))}
            ym={ym}
            initialRows={roster.map((r) => ({ id: r.id, 항목ID: r.항목ID, 구분: r.구분, 이름: r.이름 }))}
          />
        </div>
      )}
    </>
  );
}
