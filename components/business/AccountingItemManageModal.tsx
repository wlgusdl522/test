import FormToggle from '@/components/FormToggle';
import type { AccountingItem } from '@/lib/mutate/boardAccounting';
import {
  addAccountingItemAction, deleteAccountingItemAction, moveAccountingItemAction,
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

// 회계 전용 항목 관리 — 시설마다 항목 구성이 다르고 수입/지출 구분 + 그룹(소계 단위)이 있어서
// 일반 ItemManageModal(항목명만)과 별도로 둔다.
export default function AccountingItemManageModal({ 시설, items }: { 시설: string; items: AccountingItem[] }) {
  const 수입 = items.filter((i) => i.구분 === '수입');
  const 지출 = items.filter((i) => i.구분 === '지출');

  return (
    <FormToggle label="항목 관리" buttonLabel="항목 관리" wrapperClassName="mb-5">
      <p className={`${hint} mb-4`}>
        그룹명이 같으면 자동으로 묶여서 소계가 계산돼요. 화살표는 같은 구분(수입/지출) 안에서만 순서를 바꿉니다. 삭제는 되돌릴 수 없어요.
      </p>

      <form action={addAccountingItemAction} className="mb-4 flex flex-wrap gap-2 rounded-lg bg-[#f7f8fa] p-3 dark:bg-zinc-800/50">
        <input type="hidden" name="시설" value={시설} />
        <select name="구분" defaultValue="수입" className={`${inputBase} w-24`}>
          <option value="수입">수입</option>
          <option value="지출">지출</option>
        </select>
        <input name="그룹" placeholder="그룹명(예: 보조금수입)" required className={`${inputBase} w-40`} />
        <input name="항목명" placeholder="항목명" required className={`${inputBase} flex-1 min-w-[8rem]`} />
        <button type="submit" className={`${btn} shrink-0`}>
          <PlusIcon /> 추가
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {([['수입', 수입], ['지출', 지출]] as const).map(([label, list]) => (
          <div key={label}>
            <p className="mb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label} ({list.length})</p>
            {list.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">등록된 항목이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {list.map((item, i) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">
                      <span className="text-zinc-400">{item.그룹}</span>
                      {item.항목명 !== item.그룹 && <> · {item.항목명}</>}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <form action={moveAccountingItemAction}>
                        <input type="hidden" name="시설" value={시설} />
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button type="submit" disabled={i === 0} aria-label="위로" className={iconBtn}>
                          <ChevronUpIcon />
                        </button>
                      </form>
                      <form action={moveAccountingItemAction}>
                        <input type="hidden" name="시설" value={시설} />
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button type="submit" disabled={i === list.length - 1} aria-label="아래로" className={iconBtn}>
                          <ChevronDownIcon />
                        </button>
                      </form>
                      <form action={deleteAccountingItemAction}>
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
          </div>
        ))}
      </div>
    </FormToggle>
  );
}
