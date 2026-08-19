import FormToggle from '@/components/FormToggle';
import TrashIcon from '@/components/icons/TrashIcon';
import SubmitButton from '@/components/SubmitButton';
import type { StaffMeetingItem } from '@/lib/mutate/staffMeeting';
import {
  addStaffMeetingItemAction,
  deleteStaffMeetingItemAction,
  moveStaffMeetingItemAction,
} from '@/app/(portal)/staff-meeting/actions';
import { btn, btnOutline, hint, input } from '@/lib/ui';

const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none dark:text-zinc-400 dark:hover:bg-zinc-800';
const iconBtnDanger = `${iconBtn} hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950/40`;

// 팀별 "사업구분" 고정 목록 관리 — 회계/자원봉사자/후원의 ItemManageModal과 같은 결이지만
// 모듈(전체 시설 공용)이 아니라 팀 단위 항목이라 별도 액션(staff-meeting)에 연결한 전용 컴포넌트.
export default function ItemManageModal({
  팀명,
  items,
  buttonClassName,
  onOpen,
}: {
  팀명: string;
  items: StaffMeetingItem[];
  buttonClassName?: string;
  onOpen?: () => void;
}) {
  return (
    <FormToggle
      label="사업구분 관리"
      buttonLabel="사업구분 관리"
      buttonClassName={buttonClassName ?? btnOutline}
      wrapperClassName=""
      onOpen={onOpen}
    >
      <p className={`${hint} mb-4`}>화살표로 순서를 바꾸고, 삭제는 되돌릴 수 없어요.</p>

      <p className={`${hint} mb-2`}>줄바꿈으로 입력하면 표에서도 그 줄바꿈 그대로 보여요(예: &quot;상담사업{'\n'}권익증진사업&quot;).</p>
      <form action={addStaffMeetingItemAction} className="mb-4 flex gap-2 rounded-lg bg-[#f7f8fa] p-3 dark:bg-zinc-800/50">
        <input type="hidden" name="팀명" value={팀명} />
        <textarea
          name="사업구분" placeholder="추가할 사업구분 (예: 시설관리)" required rows={2}
          className={`${input} bg-white dark:bg-zinc-900`}
        />
        <SubmitButton className={`${btn} shrink-0`} pendingLabel="추가 중...">+ 추가</SubmitButton>
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
              <span className="flex-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{item.사업구분}</span>
              <div className="flex items-center gap-0.5">
                <form action={moveStaffMeetingItemAction}>
                  <input type="hidden" name="팀명" value={팀명} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton disabled={i === 0} ariaLabel="위로" showPendingLabel={false} className={iconBtn}>▲</SubmitButton>
                </form>
                <form action={moveStaffMeetingItemAction}>
                  <input type="hidden" name="팀명" value={팀명} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton disabled={i === items.length - 1} ariaLabel="아래로" showPendingLabel={false} className={iconBtn}>▼</SubmitButton>
                </form>
                <form action={deleteStaffMeetingItemAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <SubmitButton ariaLabel="삭제" showPendingLabel={false} className={iconBtnDanger}>
                    <TrashIcon />
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FormToggle>
  );
}
