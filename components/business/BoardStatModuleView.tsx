import Link from 'next/link';
import FormToggle from '@/components/FormToggle';
import BoardStatEntryClient from '@/components/business/BoardStatEntryClient';
import BoardRosterGridClient from '@/components/business/BoardRosterGridClient';
import RosterSummaryTable from '@/components/business/RosterSummaryTable';
import { facilitiesFor, getModuleItems, getModuleValues, priorCumulative, valueFor, NO_FACILITY, type BoardStatModule } from '@/lib/mutate/boardStat';
import { getRosterByItems, summarizeRoster } from '@/lib/mutate/boardRoster';
import { addBoardStatItemAction, deleteBoardStatItemAction, moveBoardStatItemAction } from '@/app/(portal)/business-summary/boardStatActions';
import { btn, btnOutline, btnSecondary, card, h2, hint, input, inputBase } from '@/lib/ui';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none dark:text-zinc-400 dark:hover:bg-zinc-800';
const iconBtnDanger = `${iconBtn} hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950/40`;

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15l6-6 6 6" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-.8 12.1a2 2 0 01-2 1.9H8.8a2 2 0 01-2-1.9L6 7h12z" />
    </svg>
  );
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
        <p className={`${hint} mb-4`}>화살표로 순서를 바꾸고, 삭제는 되돌릴 수 없어요.</p>

        <form action={addBoardStatItemAction} className="mb-4 flex gap-2 rounded-lg bg-[#f7f8fa] p-3 dark:bg-zinc-800/50">
          <input type="hidden" name="모듈" value={모듈} />
          <input
            name="항목명" placeholder="추가할 항목명" required
            className={`${input} bg-white dark:bg-zinc-900`}
          />
          <button type="submit" className={`${btn} shrink-0`}>
            <PlusIcon /> 추가
          </button>
        </form>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">등록된 항목이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((item, i) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11px] font-semibold text-brand-dark dark:bg-zinc-800 dark:text-brand">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">{item.항목명}</span>
                <div className="flex items-center gap-0.5">
                  <form action={moveBoardStatItemAction}>
                    <input type="hidden" name="모듈" value={모듈} />
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" disabled={i === 0} aria-label="위로" className={iconBtn}>
                      <ChevronUpIcon />
                    </button>
                  </form>
                  <form action={moveBoardStatItemAction}>
                    <input type="hidden" name="모듈" value={모듈} />
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" disabled={i === items.length - 1} aria-label="아래로" className={iconBtn}>
                      <ChevronDownIcon />
                    </button>
                  </form>
                  <form action={deleteBoardStatItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" aria-label="삭제" className={iconBtnDanger}>
                      <TrashIcon />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
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
