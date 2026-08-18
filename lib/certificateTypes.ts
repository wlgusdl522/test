// 증명서/상장 종류 상수 — 클라이언트 컴포넌트와 서버 모듈(lib/supabase/certificate.ts) 양쪽에서
// 그대로 쓸 수 있도록, Node 전용 의존성(googleapis 등)이 없는 이 파일에 따로 둔다.
export const CERTIFICATE_TYPES = ['재직증명서', '경력증명서', '원천징수영수증', '기타'] as const;
export const AWARD_TYPES = ['임명장', '수료증', '상장', '기타'] as const;
export const AWARD_TARGET_KINDS = ['어르신', '자원봉사자', '직원', '기타'] as const;
