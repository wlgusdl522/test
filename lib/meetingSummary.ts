// "회의록 정리"/회의록 인쇄 문서에서 공용으로 쓰는 회의록 반영 업무 표기 로직.
// 같은 사람이 같은 업무를 여러 날 체크했으면 한 줄로 합쳐서 "업무내용(7/27, 7/29)"로 보여준다.
export function formatMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function groupHighlightedTasks(tasks: Record<string, string>[]): { name: string; label: string }[] {
  const map = new Map<string, { name: string; text: string; dates: string[] }>();
  for (const t of tasks) {
    const key = `${t.성명}::${t.업무내용}`;
    if (!map.has(key)) map.set(key, { name: t.성명, text: t.업무내용, dates: [] });
    map.get(key)!.dates.push(t.날짜);
  }
  return Array.from(map.values()).map(({ name, text, dates }) => {
    const dateLabel = [...dates].sort().map(formatMD).join(', ');
    return { name, label: `${text}(${dateLabel})` };
  });
}
