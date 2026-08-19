import type { CSSProperties } from 'react';

// FullReportBody(화면/인쇄용 JSX)와 renderFullReportHtml(hwpx 변환용 문자열 빌더)가 완전히 같은
// 오피스 문서 스타일(검은 테두리·회색 헤더)을 쓰도록 스타일 정의만 한 곳에 모아둔다. 두 렌더러가
// 서로 다른 형태(JSX vs 문자열)라 마크업 자체는 공유할 수 없지만(Next.js가 라우트 핸들러에서
// react-dom/server 직접 import를 막아서 hwpx 변환 쪽은 JSX를 쓸 수 없다), 스타일 값이라도
// 어긋나지 않게 여기서만 정의한다.
export const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 700, margin: '22px 0 8px', borderBottom: '2px solid #000', paddingBottom: 4 };
export const subTitle: CSSProperties = { fontSize: 12.5, fontWeight: 700, margin: '10px 0 6px' };
export const reportTable: CSSProperties = { width: '100%', borderCollapse: 'collapse', marginBottom: 10, tableLayout: 'fixed' };
export const th: CSSProperties = { border: '1px solid #000', background: '#f2f2f2', fontWeight: 700, textAlign: 'center', padding: '4px 6px', fontSize: 11 };
export const td: CSSProperties = { border: '1px solid #000', padding: '4px 6px', fontSize: 11, verticalAlign: 'top', wordBreak: 'break-word' };
export const tdC: CSSProperties = { ...td, textAlign: 'center' };
export const tdR: CSSProperties = { ...td, textAlign: 'right' };
export const totalRow: CSSProperties = { background: '#eee', fontWeight: 700 };

const CSS_KEY_TO_KEBAB: Record<string, string> = {};
function toKebab(key: string): string {
  if (!CSS_KEY_TO_KEBAB[key]) CSS_KEY_TO_KEBAB[key] = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  return CSS_KEY_TO_KEBAB[key];
}

// 문자열 HTML 빌더(renderFullReportHtml)에서 위 스타일 객체를 style="" 속성 문자열로 바꿔 쓰기 위함.
export function styleAttr(...styles: CSSProperties[]): string {
  const merged = Object.assign({}, ...styles) as Record<string, string | number>;
  return Object.entries(merged)
    .map(([k, v]) => `${toKebab(k)}:${v}`)
    .join(';');
}
