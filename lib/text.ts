// 업무보고·사업계획 등 보고서 문체는 첫 줄 앞에 한 칸을 띄워 쓰는 관행이 있다(이후 줄의
// "- 장소 : ..." 같은 항목은 띄우지 않음). 사용자가 매번 스페이스를 직접 치지 않아도 되도록,
// 저장 시점(포커스를 벗어날 때)에 첫 줄만 한 칸 들여쓴다 — 이미 들여써져 있으면 그대로 둔다.
export function ensureFirstLineIndent(text: string): string {
  if (!text || !text.trim()) return text;
  const firstNewline = text.indexOf('\n');
  const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline);
  if (firstLine.startsWith(' ')) return text;
  return ` ${text}`;
}
