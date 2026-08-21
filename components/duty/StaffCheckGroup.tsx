// 시스템설정 > "전체회의 잔디 알림 보내기 가능 담당자" 목록과 같은 팀별 그룹 체크박스 UI.
// 자유 입력 텍스트 대신 실제 직원 목록에서 골라 누구인지 한눈에 보이게 한다.
export default function StaffCheckGroup({
  name,
  label,
  type,
  staffGroups,
  selectedNames,
}: {
  name: string;
  label: string;
  type: 'checkbox' | 'radio';
  staffGroups: { team: string; staff: { email: string; name: string }[] }[];
  selectedNames: string[];
}) {
  return (
    <div className="sm:col-span-2 flex flex-col gap-1.5">
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="flex max-h-40 flex-wrap gap-x-4 gap-y-2 overflow-y-auto rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
        {staffGroups.map((g) => (
          <div
            key={g.team}
            className="flex min-w-[110px] flex-1 flex-col gap-1 border-l border-dashed border-zinc-200 pl-3 first:border-l-0 first:pl-0 dark:border-zinc-700"
          >
            <div className="text-[10.5px] font-bold text-zinc-400">{g.team}</div>
            {g.staff.map((s) => (
              <label key={s.email} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                <input type={type} name={name} value={s.name} defaultChecked={selectedNames.includes(s.name)} />
                {s.name}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
