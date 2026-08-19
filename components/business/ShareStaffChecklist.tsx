import type { ActiveStaff } from '@/lib/mutate/permissions';

export default function ShareStaffChecklist({
  groups,
  checkedEmails = [],
}: {
  groups: { team: string; staff: ActiveStaff[] }[];
  checkedEmails?: string[];
}) {
  return (
    <div className="mt-1 flex max-h-56 flex-wrap gap-x-4 gap-y-3 overflow-y-auto rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
      {groups.map((g) => (
        <div key={g.team} className="flex min-w-[130px] flex-1 flex-col gap-1.5 border-l border-dashed border-zinc-200 pl-3 first:border-l-0 first:pl-0 dark:border-zinc-700">
          <div className="text-[10.5px] font-bold text-zinc-400">{g.team}</div>
          {g.staff.map((s) => (
            <label key={s.email} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                name="shareEmails"
                value={s.email}
                defaultChecked={checkedEmails.includes(s.email.toLowerCase())}
              />
              {s.name}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
