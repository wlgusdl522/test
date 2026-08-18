// 클라이언트 컴포넌트(AccountingEntryClient)와 서버 전용 boardAccounting.ts 양쪽에서 같이 쓰는
// 순수 함수라 별도 파일로 분리했다 — boardAccounting.ts는 googleapis를 쓰는 keyedTable을 불러오는데,
// 클라이언트 컴포넌트가 그 파일에서 뭐라도 하나 가져오면 googleapis까지 브라우저 번들에 끌려와 빌드가
// 깨진다(자원봉사자 rosterConstants.ts 분리 때 겪은 것과 같은 문제).
export function isCarryForwardItem(항목명: string): boolean {
  return 항목명.includes('전월이월');
}
