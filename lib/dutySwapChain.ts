// 당직 교체가 여러 번 일어나도(A→B→C ...) 전체 이력을 보여주기 위한 순수 파싱 헬퍼.
// DUTY_LOG 테이블의 '원배정성명'(및 '원배정성명1'/'원배정성명2') 컬럼에는 현재 담당자 이전에
// 거쳐간 이름들을 JSON 배열 문자열로 쌓아두고, 여기에 지금 담당자 이름만 더하면 전체 체인이 된다.

export function parseSwapChain(json: string): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function formatSwapChain(pastNamesJson: string, currentName: string): string {
  const past = parseSwapChain(pastNamesJson);
  return [...past, currentName].join('→');
}
