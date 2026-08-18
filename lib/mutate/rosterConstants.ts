// 클라이언트 컴포넌트에서도 안전하게 쓸 수 있도록, 서버 전용 의존성(googleapis 등)을 물고 오는
// boardRoster.ts와 분리해서 상수만 따로 둔다 — 단체명은 매번 바꿀 일이 없어서 그냥 고정값.
export const ROSTER_GROUP_SHORT = '새문안';
export const ROSTER_GROUP_FULL = '새문안교회';
