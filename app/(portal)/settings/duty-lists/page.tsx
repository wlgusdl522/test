import { getStaffList } from '@/lib/mutate/staff';
import { getDutyExclusions, getDutyHolidays, getDutyOrder, type DutyOrderType } from '@/lib/supabase/duty';
import { btn, btnDanger, btnSecondary, h1, h2, input, label, pageFluid } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { generateDutyBatchAction } from '@/app/(portal)/duty/actions';
import { addDays, todayISO } from '@/lib/dutyDate';
import {
  addDutyExclusionAction,
  addDutyHolidayAction,
  addDutyOrderAction,
  deleteDutyExclusionAction,
  deleteDutyHolidayAction,
  moveDutyOrderAction,
  reapplyDutyExclusionsAction,
  removeDutyOrderAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function OrderSection({
  type,
  label,
  items,
  staff,
}: {
  type: DutyOrderType;
  label: string;
  items: { id: string; 이메일: string; 성명: string; 정렬순서: number }[];
  staff: Record<string, string>[];
}) {
  return (
    <section>
      <h2 className={h2}>{label}</h2>
      <FormToggle label="추가">
        <form action={addDutyOrderAction} className="flex gap-2 mb-3">
          <input type="hidden" name="type" value={type} />
          <select name="staff" required className={input}>
            <option value="">직원 선택</option>
            {staff.map((s) => (
              <option key={s['이메일(아이디)']} value={`${s['이메일(아이디)']}::${s.성명}`}>
                {s.성명} ({s.소속팀})
              </option>
            ))}
          </select>
          <button type="submit" className={btn}>추가</button>
        </form>
      </FormToggle>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-1.5 text-sm">
            <span className="flex-1 text-zinc-800 dark:text-zinc-200">{item.성명}</span>
            <form action={moveDutyOrderAction}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" disabled={i === 0} className={`${btnSecondary} disabled:opacity-30`}>위</button>
            </form>
            <form action={moveDutyOrderAction}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" disabled={i === items.length - 1} className={`${btnSecondary} disabled:opacity-30`}>아래</button>
            </form>
            <form action={removeDutyOrderAction}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className={btnDanger}>삭제</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function DutyListsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    applied?: string;
    weekday?: string;
    saturday?: string;
    deployed?: string;
    weekdayNew?: string;
    saturdayNew?: string;
  }>;
}) {
  const {
    year: yearParam,
    applied,
    weekday: appliedWeekday,
    saturday: appliedSaturday,
    deployed,
    weekdayNew,
    saturdayNew,
  } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam ? Number(yearParam) : currentYear;
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const [staffAll, weekdayOrder, saturdayOrder, holidaysAll, exclusions] = await Promise.all([
    getStaffList(),
    getDutyOrder('weekday'),
    getDutyOrder('saturday'),
    getDutyHolidays(),
    getDutyExclusions(),
  ]);
  const staff = staffAll.filter((s) => s['재직상태'] === '재직');
  const holidays = holidaysAll.filter((h) => h.날짜.startsWith(String(year)));

  const today = todayISO();
  const in60Days = addDays(today, 60);

  return (
    <main className={pageFluid}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>설정 &gt; 당직 순서 / 공휴일 / 제외목록</h1>
        <div className="flex items-center gap-3">
          <form method="get" className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">연도</span>
            <select name="year" defaultValue={year} className={`${input} w-auto`}>
              {years.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <button type="submit" className={btnSecondary}>조회</button>
          </form>
          <form action={reapplyDutyExclusionsAction}>
            <input type="hidden" name="year" value={year} />
            <button type="submit" className={btn} title="오늘 이후, 아직 서명 안 된 배정에 현재 제외 규칙을 다시 반영합니다">
              설정 값 적용
            </button>
          </form>
          <FormToggle label="2개월 배포">
            <form action={generateDutyBatchAction} className="flex flex-col gap-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                평일/토요 당직순서에 등록된 순서대로 배정을 생성합니다. 이미 배정이 있는 날짜는 건드리지 않습니다.
              </p>
              <label className={label}>
                시작일
                <input type="date" name="start" defaultValue={today} required className={input} />
              </label>
              <label className={label}>
                종료일
                <input type="date" name="end" defaultValue={in60Days} required className={input} />
              </label>
              <button type="submit" className={btn}>배포 실행</button>
            </form>
          </FormToggle>
        </div>
      </div>

      {applied === '1' && (
        <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          적용 완료 — 평일 {appliedWeekday}건, 토요 {appliedSaturday}건 교체됨
        </div>
      )}
      {deployed === '1' && (
        <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          배포 완료 — 평일 {weekdayNew}건, 토요 {saturdayNew}건 새로 생성됨
        </div>
      )}

      <div className="grid grid-cols-4 gap-5">
        <OrderSection type="weekday" label="평일당직순서" items={weekdayOrder} staff={staff} />
        <OrderSection type="saturday" label="토요당직순서" items={saturdayOrder} staff={staff} />

        <section>
          <h2 className={h2}>제외 직원 및 기간</h2>
          <FormToggle label="추가">
            <form action={addDutyExclusionAction} className="flex flex-col gap-2 mb-3">
              <select name="staff" required className={input}>
                <option value="">직원 선택</option>
                {staffAll.map((s) => (
                  <option key={s['이메일(아이디)']} value={`${s['이메일(아이디)']}::${s.성명}`}>
                    {s.성명} ({s.소속팀})
                  </option>
                ))}
              </select>
              <input type="date" name="start" required className={input} />
              <input type="date" name="end" required className={input} />
              <input name="reason" placeholder="제외 사유" className={input} />
              <button type="submit" className={btn}>추가</button>
            </form>
          </FormToggle>
          <ul className="flex flex-col gap-1">
            {exclusions.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 text-sm border-b border-zinc-100 dark:border-zinc-800 pb-1.5 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 font-medium text-zinc-800 dark:text-zinc-200">{e.성명}</span>
                  <form action={deleteDutyExclusionAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className={btnDanger}>삭제</button>
                  </form>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {e.시작일} ~ {e.종료일} {e.사유 && `· ${e.사유}`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={h2}>공휴일 ({year}년)</h2>
          <FormToggle label="추가">
            <form action={addDutyHolidayAction} className="flex flex-col gap-2 mb-3">
              <input type="date" name="date" required defaultValue={`${year}-01-01`} className={input} />
              <input name="name" placeholder="휴일명" required className={input} />
              <button type="submit" className={btn}>추가</button>
            </form>
          </FormToggle>
          <ul className="flex flex-col gap-1">
            {holidays.map((h) => (
              <li key={h.날짜} className="flex items-center gap-1.5 text-sm">
                <span className="w-24 text-zinc-500 dark:text-zinc-400">{h.날짜}</span>
                <span className="flex-1 text-zinc-800 dark:text-zinc-200">{h.휴일명}</span>
                <form action={deleteDutyHolidayAction}>
                  <input type="hidden" name="date" value={h.날짜} />
                  <button type="submit" className={btnDanger}>삭제</button>
                </form>
              </li>
            ))}
            {holidays.length === 0 && <li className="text-sm text-zinc-400">{year}년에 등록된 공휴일이 없습니다.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
