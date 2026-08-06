import type { ActiveStaff } from '@/lib/mutate/permissions';

export default function ShareStaffChecklist({
  groups,
  checkedEmails = [],
}: {
  groups: { team: string; staff: ActiveStaff[] }[];
  checkedEmails?: string[];
}) {
  return (
    <div className="mt-1 flex max-h-56 flex-col gap-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
      {groups.map((g) => (
        <div key={g.team}>
          <div className="mb-1 text-[10.5px] font-bold text-zinc-400">{g.team}</div>
          <div className="grid grid-cols-2 gap-1">
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
        </div>
      ))}
    </div>
  );
}
