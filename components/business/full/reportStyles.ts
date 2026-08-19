import type { CSSProperties } from 'react';

// FullReportBody(전체보기 화면/인쇄)에서 쓰는 오피스 문서 스타일(검은 테두리·회색 헤더)을 한 곳에
// 모아둔다.
export const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 700, margin: '22px 0 8px', borderBottom: '2px solid #000', paddingBottom: 4 };
export const subTitle: CSSProperties = { fontSize: 12.5, fontWeight: 700, margin: '10px 0 6px' };
export const reportTable: CSSProperties = { width: '100%', borderCollapse: 'collapse', marginBottom: 10, tableLayout: 'fixed' };
export const th: CSSProperties = { border: '1px solid #000', background: '#f2f2f2', fontWeight: 700, textAlign: 'center', padding: '4px 6px', fontSize: 11 };
export const td: CSSProperties = { border: '1px solid #000', padding: '4px 6px', fontSize: 11, verticalAlign: 'top', wordBreak: 'break-word' };
export const tdC: CSSProperties = { ...td, textAlign: 'center' };
export const tdR: CSSProperties = { ...td, textAlign: 'right' };
export const totalRow: CSSProperties = { background: '#eee', fontWeight: 700 };
