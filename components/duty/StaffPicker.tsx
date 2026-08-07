'use client';

import { useMemo, useState } from 'react';
import { inputBase } from '@/lib/ui';

type Row = Record<string, string>;

export default function StaffPicker({
  staff,
  name,
  required,
}: {
  staff: Row[];
  name: string;
  required?: boolean;
}) {
  const [team, setTeam] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState('');

  const teams = useMemo(
    () => [...new Set(staff.map((s) => s.소속팀).filter(Boolean))],
    [staff]
  );
  const filtered = staff.filter(
    (s) => (!team || s.소속팀 === team) && (!q || s.성명.includes(q.trim()))
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select value={team} onChange={(e) => setTeam(e.target.value)} className={`${inputBase} w-auto`}>
          <option value="">전체 팀</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 검색"
          className={`${inputBase} flex-1`}
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="w-8 py-1.5"></th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">이름</th>
              <th className="px-2 py-1.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">소속팀</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const email = s['이메일(아이디)'];
              const value = `${email}::${s.성명}::${s.소속팀}`;
              const isSelected = selected === value;
              return (
                <tr
                  key={email}
                  onClick={() => setSelected(value)}
                  className={`cursor-pointer border-t border-zinc-100 dark:border-zinc-800 ${
                    isSelected ? 'bg-brand-tint' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <td className="py-1.5 text-center">
                    <input
                      type="radio"
                      name={name}
                      value={value}
                      checked={isSelected}
                      onChange={() => setSelected(value)}
                      required={required}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-zinc-800 dark:text-zinc-100">{s.성명}</td>
                  <td className="px-2 py-1.5 text-zinc-500 dark:text-zinc-400">{s.소속팀}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-zinc-400">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
