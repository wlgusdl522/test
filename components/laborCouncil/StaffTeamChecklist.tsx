import type { ActiveStaff } from '@/lib/mutate/permissions';

export default function StaffTeamChecklist({ staff, name }: { staff: ActiveStaff[]; name: string }) {
  const groups = new Map<string, ActiveStaff[]>();
  staff.forEach((s) => {
    const team = s.team || '(소속 미지정)';
    if (!groups.has(team)) groups.set(team, []);
    groups.get(team)!.push(s);
  });

  if (staff.length === 0) {
    return <p className="text-xs text-zinc-400">선택 가능한 직원이 없습니다.</p>;
  }

  return (
    <div className="mt-1 flex max-h-72 flex-wrap gap-x-4 gap-y-3 overflow-y-auto rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
      {[...groups.entries()].map(([team, members]) => (
        <div key={team} className="flex min-w-[130px] flex-1 flex-col gap-1.5 border-l border-dashed border-zinc-200 pl-3 first:border-l-0 first:pl-0 dark:border-zinc-700">
          <div className="text-[10.5px] font-bold text-zinc-400">{team}</div>
          {members.map((s) => (
            <label key={s.email} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" name={name} value={s.email} />
              {s.name}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
