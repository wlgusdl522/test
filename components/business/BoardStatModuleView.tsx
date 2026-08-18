import Link from 'next/link';
import FormToggle from '@/components/FormToggle';
import BoardStatEntryClient from '@/components/business/BoardStatEntryClient';
import BoardRosterGridClient from '@/components/business/BoardRosterGridClient';
import RosterSummaryTable from '@/components/business/RosterSummaryTable';
import { facilitiesFor, getModuleItems, getModuleValues, priorCumulative, valueFor, NO_FACILITY, type BoardStatModule } from '@/lib/mutate/boardStat';
import { getRosterByItems, summarizeRoster } from '@/lib/mutate/boardRoster';
import { addBoardStatItemAction, deleteBoardStatItemAction, moveBoardStatItemAction } from '@/app/(portal)/business-summary/boardStatActions';
import { btn, btnDanger, btnOutline, btnSecondary, card, h2, input, inputBase } from '@/lib/ui';

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
  const showRoster = 모듈 === '자원봉사자';
  const roster = showRoster ? await getRosterByItems(items.map((i) => i.id), ym) : [];
  const rosterRows = showRoster ? summarizeRoster(items, roster) : [];

  // 자원봉사자는 명단에서 실제 인원수가 계산되므로, 예전에 손으로 입력하던 값(금월실적) 표는
  // 회계/후원에만 필요하다 — 값이 있는데도 굳이 조회할 필요 없이 건너뛴다.
  const values = showRoster ? [] : await getModuleValues(items.map((i) => i.id));
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
        {showRoster && <Link href={`${basePath}/view?ym=${ym}`} className={btnOutline}>보기 전용 화면</Link>}
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

      {!showRoster && (
        <div className={`${card} mb-5`}>
          <h2 className={`${h2} mb-3`}>{시설 !== NO_FACILITY ? `${시설} · ` : ''}{ym} 값 입력</h2>
          <BoardStatEntryClient 시설={시설} ym={ym} rows={rows} />
        </div>
      )}

      {showRoster && (
        <>
          <RosterSummaryTable title={`1) 총괄 (${ym})`} rows={rosterRows} />

          <div className={card}>
            <h2 className={`${h2} mb-3`}>2) 분야별 명단 입력</h2>
            <BoardRosterGridClient items={rosterRows} ym={ym} />
          </div>
        </>
      )}
    </>
  );
}
