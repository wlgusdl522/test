// 엑셀 등에서 복사한 여러 행/열을 그리드형 입력에 붙여넣을 때 쓰는 공용 파서.
// 탭으로 열, 줄바꿈으로 행을 구분하는 클립보드 텍스트 규칙(엑셀 기본 복사 포맷)을 그대로 따른다.
export function parsePastedGrid(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n');
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t').map((cell) => cell.trim()));
}
