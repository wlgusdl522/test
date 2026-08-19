import { headers } from 'next/headers';

// 증명서/상장의 PDF 렌더링(lib/pdf/*.tsx)과 웹 인쇄 화면(app/print/*)이 서로 다른 렌더링
// 엔진(react-pdf vs HTML)을 쓰다 보니 겹치는 헬퍼가 각 파일에 따로 복사돼있었다 - 여기로 모은다.

export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export function formatPrintDate(iso: string): string {
  const parts = String(iso || '').split('-');
  if (parts.length < 3) return iso || '';
  return `${parts[0]}년 ${Number(parts[1])}월 ${Number(parts[2])}일`;
}

// 실제 주민등록번호는 저장하지 않고, 생년월일+성별로 문서에 찍히는 마스킹된 형태만 재현한다.
export function maskedResidentNumber(birth: string, gender: string): string {
  if (!birth) return '';
  const [y, m, d] = birth.split('-');
  if (!y || !m || !d) return '';
  const yy = y.slice(2);
  const isBefore2000 = Number(y) < 2000;
  const genderDigit = gender === '여' ? (isBefore2000 ? '2' : '4') : (isBefore2000 ? '1' : '3');
  return `${yy}${m}${d}-${genderDigit}******`;
}

export const VERIFY_PHRASE: Record<string, string> = {
  재직증명서: '위 사실을 증명합니다.',
  경력증명서: '위 사실을 증명합니다.',
  원천징수영수증: '위 내용을 확인합니다.',
  기타: '위 내용을 확인합니다.',
};

// 상장 PDF(lib/pdf/awardPdf.tsx)는 상장 테두리가 미리 인쇄된 용지에 절대좌표로 맞춰야 한다.
export const AWARD_A4_WIDTH_PT = 595.28;
export const AWARD_CONTENT_LEFT = 96;
export const AWARD_CONTENT_RIGHT = 96;
export const AWARD_CONTENT_WIDTH = AWARD_A4_WIDTH_PT - AWARD_CONTENT_LEFT - AWARD_CONTENT_RIGHT;
