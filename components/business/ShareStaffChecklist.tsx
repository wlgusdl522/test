import type { ActiveStaff } from '@/lib/mutate/permissions';

export default function ShareStaffChecklist({
  groups,
  checkedEmails = [],
}: {
  groups: { team: string; staff: ActiveStaff[] }[];
  checkedEmails?: string[];
}) {
  return (
    <div
      className="mt-1 grid max-h-56 gap-x-4 divide-x divide-dashed divide-zinc-200 overflow-y-auto rounded-md border border-zinc-200 p-3 dark:divide-zinc-700 dark:border-zinc-700"
      style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}
    >
      {groups.map((g) => (
        <div key={g.team} className="flex flex-col gap-1.5 pl-3 first:pl-0">
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
