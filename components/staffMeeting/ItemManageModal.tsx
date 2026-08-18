import FormToggle from '@/components/FormToggle';
import TrashIcon from '@/components/icons/TrashIcon';
import type { StaffMeetingItem } from '@/lib/mutate/staffMeeting';
import {
  addStaffMeetingItemAction,
  deleteStaffMeetingItemAction,
  moveStaffMeetingItemAction,
} from '@/app/(portal)/staff-meeting/actions';
import { btn, hint, input } from '@/lib/ui';

const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none dark:text-zinc-400 dark:hover:bg-zinc-800';
const iconBtnDanger = `${iconBtn} hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950/40`;

// 팀별 "사업구분" 고정 목록 관리 — 회계/자원봉사자/후원의 ItemManageModal과 같은 결이지만
// 모듈(전체 시설 공용)이 아니라 팀 단위 항목이라 별도 액션(staff-meeting)에 연결한 전용 컴포넌트.
export default function ItemManageModal({ 팀명, items }: { 팀명: string; items: StaffMeetingItem[] }) {
  return (
    <FormToggle label="사업구분 관리" buttonLabel="사업구분 관리" wrapperClassName="mb-5">
      <p className={`${hint} mb-4`}>화살표로 순서를 바꾸고, 삭제는 되돌릴 수 없어요.</p>

      <form action={addStaffMeetingItemAction} className="mb-4 flex gap-2 rounded-lg bg-[#f7f8fa] p-3 dark:bg-zinc-800/50">
        <input type="hidden" name="팀명" value={팀명} />
        <input
          name="사업구분" placeholder="추가할 사업구분 (예: 시설관리)" required
          className={`${input} bg-white dark:bg-zinc-900`}
        />
        <button type="submit" className={`${btn} shrink-0`}>+ 추가</button>
      </form>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">등록된 사업구분이 없습니다.</p>
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
              <span className="flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">{item.사업구분}</span>
              <div className="flex items-center gap-0.5">
                <form action={moveStaffMeetingItemAction}>
                  <input type="hidden" name="팀명" value={팀명} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} aria-label="위로" className={iconBtn}>▲</button>
                </form>
                <form action={moveStaffMeetingItemAction}>
                  <input type="hidden" name="팀명" value={팀명} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === items.length - 1} aria-label="아래로" className={iconBtn}>▼</button>
                </form>
                <form action={deleteStaffMeetingItemAction}>
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
  );
}
