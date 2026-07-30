'use client';

import { useState, useTransition } from 'react';
import { input, label } from '@/lib/ui';
import { syncMyWeeklyTaskDayAction, toggleHighlightAction } from '@/app/(portal)/weekly-plan/actions';
import { FULL_DAY_LEAVE_TYPES, LEAVE_TYPES, parseLeaveTag } from '@/lib/weeklyLeave';

type Task = { id: string; 날짜: string; 업무내용: string; 회의록후보: string };

function parseBulletLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);
}

function toBulletText(tasks: Task[]): string {
  return tasks.length ? tasks.map((t) => `• ${t.업무내용}`).join('\n') : '';
}

export default function WeeklyTaskCalendar({
  dayDates,
  weekdayLabels,
  initialTasks,
  myName,
}: {
  dayDates: string[];
  weekdayLabels: string[];
  initialTasks: Task[];
  myName: string;
}) {
  const [tasksByDay, setTasksByDay] = useState<Record<string, Task[]>>(() => {
    const grouped: Record<string, Task[]> = {};
    for (const iso of dayDates) grouped[iso] = initialTasks.filter((t) => t.날짜 === iso);
    return grouped;
  });
  const [textByDay, setTextByDay] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const iso of dayDates) map[iso] = toBulletText(initialTasks.filter((t) => t.날짜 === iso));
    return map;
  });
  const [statusText, setStatusText] = useState('');
  const [, startTransition] = useTransition();

  async function syncDay(iso: string, text: string) {
    const lines = parseBulletLines(text);
    setStatusText('저장 중...');
    try {
      const updated = await syncMyWeeklyTaskDayAction(iso, lines);
      setTasksByDay((prev) => ({ ...prev, [iso]: updated as Task[] }));
      setTextByDay((prev) => ({ ...prev, [iso]: toBulletText(updated as Task[]) }));
      setStatusText('저장됨');
    } catch (err) {
      setStatusText(err instanceof Error ? err.message : '저장 실패');
    }
  }

  function handleLeaveChange(iso: string, type: string) {
    const remaining = parseBulletLines(textByDay[iso] ?? '').filter((line) => !parseLeaveTag(line));
    let newLines: string[];
    if (!type) newLines = remaining;
    else if (FULL_DAY_LEAVE_TYPES.includes(type)) newLines = [`${myName}(${type})`];
    else newLines = [`${myName}(${type})`, ...remaining];
    const text = newLines.length ? `• ${newLines.join('\n• ')}` : '';
    setTextByDay((prev) => ({ ...prev, [iso]: text }));
    startTransition(() => {
      syncDay(iso, text);
    });
  }

  async function handleChecklistToggle(id: string, checked: boolean) {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('flag', String(checked));
    await toggleHighlightAction(fd);
    setTasksByDay((prev) => {
      const next: Record<string, Task[]> = {};
      for (const iso of Object.keys(prev)) {
        next[iso] = prev[iso].map((t) => (t.id === id ? { ...t, 회의록후보: checked ? 'TRUE' : 'FALSE' } : t));
      }
      return next;
    });
  }

  return (
    <div>
      <div className="grid grid-cols-6 gap-3 mb-2">
        {dayDates.map((iso, i) => {
          const d = new Date(`${iso}T00:00:00`);
          const dayTasks = tasksByDay[iso] ?? [];
          const leaveTag = dayTasks.map((t) => parseLeaveTag(t.업무내용)).find(Boolean);
          const leaveVal = leaveTag?.type ?? '';
          const isFullDayLeave = FULL_DAY_LEAVE_TYPES.includes(leaveVal);
          return (
            <div key={iso} className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {weekdayLabels[i]} ({d.getMonth() + 1}/{d.getDate()})
              </div>
              <select
                className={`${input} text-xs`}
                value={leaveVal}
                onChange={(e) => handleLeaveChange(iso, e.target.value)}
              >
                <option value="">휴가/교육 없음</option>
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea
                className={`${input} text-xs min-h-24 resize-y ${isFullDayLeave ? 'opacity-50' : ''}`}
                value={textByDay[iso] ?? ''}
                disabled={isFullDayLeave}
                onFocus={(e) => {
                  if (!e.target.value) setTextByDay((prev) => ({ ...prev, [iso]: '• ' }));
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const el = e.currentTarget;
                  const start = el.selectionStart, end = el.selectionEnd;
                  const value = `${el.value.slice(0, start)}\n• ${el.value.slice(end)}`;
                  setTextByDay((prev) => ({ ...prev, [iso]: value }));
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 3;
                  });
                }}
                onChange={(e) => setTextByDay((prev) => ({ ...prev, [iso]: e.target.value }))}
                onBlur={(e) => syncDay(iso, e.target.value)}
              />
              {dayTasks.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <div className="text-[11px] text-zinc-400">회의록에 반영</div>
                  {dayTasks.map((t) => (
                    <label key={t.id} className="flex items-start gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        defaultChecked={t.회의록후보 === 'TRUE' || t.회의록후보 === 'true'}
                        onChange={(e) => handleChecklistToggle(t.id, e.target.checked)}
                      />
                      {t.업무내용}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {statusText && <p className="text-xs text-zinc-400">{statusText}</p>}
    </div>
  );
}
