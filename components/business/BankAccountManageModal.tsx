import FormToggle from '@/components/FormToggle';
import type { BankAccount } from '@/lib/mutate/boardBankAccount';
import {
  addBankAccountAction, deleteBankAccountAction, moveBankAccountAction,
} from '@/app/(portal)/business-summary/boardAccountingActions';
import { btn, hint, inputBase } from '@/lib/ui';

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

export default function BankAccountManageModal({ 시설, accounts }: { 시설: string; accounts: BankAccount[] }) {
  return (
    <FormToggle label="계좌 관리" buttonLabel="계좌 관리" wrapperClassName="mb-5">
      <p className={`${hint} mb-4`}>삭제는 되돌릴 수 없어요.</p>

      <form action={addBankAccountAction} className="mb-4 flex flex-wrap gap-2 rounded-lg bg-[#f7f8fa] p-3 dark:bg-zinc-800/50">
        <input type="hidden" name="시설" value={시설} />
        <input name="은행명" placeholder="은행명" required className={`${inputBase} w-28`} />
        <input name="계좌번호" placeholder="계좌번호" required className={`${inputBase} w-44`} />
        <input name="비고" placeholder="비고(용도)" className={`${inputBase} flex-1 min-w-[8rem]`} />
        <button type="submit" className={`${btn} shrink-0`}>
          <PlusIcon /> 추가
        </button>
      </form>

      {accounts.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">등록된 계좌가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {accounts.map((a, i) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">
                {a.은행명} <span className="text-zinc-400">{a.계좌번호}</span>
                {a.비고 && <> · {a.비고}</>}
              </span>
              <div className="flex items-center gap-0.5">
                <form action={moveBankAccountAction}>
                  <input type="hidden" name="시설" value={시설} />
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} aria-label="위로" className={iconBtn}>
                    <ChevronUpIcon />
                  </button>
                </form>
                <form action={moveBankAccountAction}>
                  <input type="hidden" name="시설" value={시설} />
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === accounts.length - 1} aria-label="아래로" className={iconBtn}>
                    <ChevronDownIcon />
                  </button>
                </form>
                <form action={deleteBankAccountAction}>
                  <input type="hidden" name="id" value={a.id} />
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
