import FormToggle from '@/components/FormToggle';
import SubmitButton from '@/components/SubmitButton';
import { moveStaffMeetingTeamOrderAction } from '@/app/(portal)/staff-meeting/actions';
import { btnOutline, hint } from '@/lib/ui';

const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none dark:text-zinc-400 dark:hover:bg-zinc-800';

// 발표모드에서 팀이 보여지는 순서 — 설정 > 팀목록 순서와 별개로 여기서 직접 관리한다
// (예: 총무팀이 팀목록에선 앞이지만 발표는 맨 마지막이어야 하는 경우).
export default function TeamOrderModal({
  teams,
  buttonClassName,
  onOpen,
}: {
  teams: string[];
  buttonClassName?: string;
  onOpen?: () => void;
}) {
  return (
    <FormToggle
      label="발표순서 관리"
      buttonLabel="발표순서 관리"
      buttonClassName={buttonClassName ?? btnOutline}
      wrapperClassName=""
      onOpen={onOpen}
    >
      <p className={`${hint} mb-4`}>발표 모드에서 팀이 나오는 순서예요. 화살표로 순서를 바꿀 수 있어요.</p>
      <ul className="flex flex-col gap-1.5">
        {teams.map((t, i) => (
          <li
            key={t}
            className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11px] font-semibold text-brand-dark dark:bg-zinc-800 dark:text-brand">
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{t}</span>
            <div className="flex items-center gap-0.5">
              <form action={moveStaffMeetingTeamOrderAction}>
                <input type="hidden" name="팀명" value={t} />
                <input type="hidden" name="direction" value="up" />
                <SubmitButton disabled={i === 0} ariaLabel="위로" showPendingLabel={false} className={iconBtn}>▲</SubmitButton>
              </form>
              <form action={moveStaffMeetingTeamOrderAction}>
                <input type="hidden" name="팀명" value={t} />
                <input type="hidden" name="direction" value="down" />
                <SubmitButton disabled={i === teams.length - 1} ariaLabel="아래로" showPendingLabel={false} className={iconBtn}>▼</SubmitButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </FormToggle>
  );
}
