import { input } from '@/lib/ui';

// 업무시간(09:00~18:00)만 선택 가능 — 차량은 근무시간 중에만 운행하므로.
const OPTIONS: string[] = [];
for (let h = 9; h <= 18; h++) {
  for (let m = 0; m < 60; m += 10) {
    if (h === 18 && m > 0) break;
    OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export default function TimeSelect10Min({
  name,
  defaultValue,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ''}
      className={input}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    >
      <option value="">선택 안 함</option>
      {OPTIONS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}
