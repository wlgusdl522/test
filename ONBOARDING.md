# 업무포털(portal-next) 온보딩 가이드

서대문노인종합복지관 업무포털의 Next.js 재작성 버전입니다. 기존 Google Apps Script 앱을 대체하는 프로젝트예요.

## 배포 주소
- 운영: https://sdmsenior-portal.vercel.app
- Vercel에 `main` 브랜치 push하면 자동 배포됩니다.

## 프로젝트 개요
- **프론트/백엔드**: Next.js App Router (Server Components + Server Actions)
- **읽기**: Supabase(Postgres) — 구글시트를 미러링해둔 읽기 전용 캐시
- **쓰기**: 구글시트가 원본(source of truth). 서버에서 구글 서비스계정으로 Sheets API를 직접 호출해서 쓰고, 성공하면 Supabase에도 같은 내용을 미러링함
- **인증**: Auth.js(NextAuth v5) + Google OAuth, `@sdmsenior.or.kr` 도메인만 허용
- **업로드 파일**(물품검수사진 등): Google Drive에 그대로 저장

## 로컬 개발환경 세팅

### 1. 저장소 위치 — 반드시 로컬 디스크에 클론
```
git clone https://github.com/wlgusdl522/portal-next.git
cd portal-next
npm install
```
⚠️ **네트워크 드라이브(예: 회사 공유드라이브 Z:)에 두고 작업하지 마세요.** `npm install`이 깨집니다. 반드시 `C:\Users\<사용자명>\projects\` 같은 로컬 경로에서 작업하세요.

### 2. 환경변수 (`.env.local`)
저장소에는 포함되어 있지 않습니다(`.gitignore`에 `.env*` 있음 — 절대 커밋하지 마세요). 아래 값들을 관리자(권지현)에게 받아서 프로젝트 루트에 `.env.local` 파일로 만드세요.

```
# 구글 서비스 계정 (Sheets/Drive API 호출용)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=

# 도메인 위임: 서비스계정이 대신 호출할 사용자 이메일
GOOGLE_IMPERSONATE_EMAIL=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Auth.js (Google OAuth)
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

각 값은 어디서 나오는지:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_IMPERSONATE_EMAIL` — GCP 프로젝트 `portal-next-503801`의 서비스계정 키(JSON). 관리자에게 요청.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase 대시보드 > Project Settings > API. 관리자에게 요청.
- `AUTH_SECRET` — 아무 랜덤 문자열이나 새로 생성 가능(`openssl rand -base64 32`). 다른 값과 달리 로컬 전용으로 새로 만들어도 무방.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — GCP 콘솔 > API 및 서비스 > 사용자 인증 정보 > OAuth 2.0 클라이언트(`sdmsenior-portal`). 로컬(`http://localhost:3000`)에서 로그인 테스트하려면 이 클라이언트의 **승인된 리디렉션 URI**에 `http://localhost:3000/api/auth/callback/google`이 이미 등록되어 있어야 함(현재 등록돼 있음).

### 3. 실행
```
npm run dev
```
http://localhost:3000 접속. `@sdmsenior.or.kr` 계정으로 로그인.

### 4. 빌드 확인 (배포 전 필수)
```
npm run build
```
반드시 exit code 0 확인. 타입 에러나 빌드 실패가 있으면 Vercel도 같은 이유로 실패하고, 실패 시 Vercel은 조용히 **직전 성공 배포**를 계속 서빙하므로 "푸시했는데 반영이 안 됨" 상태가 됩니다.

## 알아두면 좋은 구조/함정

- **한글 컬럼명 그대로 사용**: 구글시트 헤더(예: `이메일(아이디)`, `직급/직책`, `소속팀`)를 타입 변환 없이 그대로 키로 씁니다.
- **PostgREST 괄호 컬럼명 제약**: `이메일(아이디)`처럼 컬럼명에 괄호가 들어간 컬럼은 Supabase `.eq()` 필터나 upsert의 `onConflict`에 절대 쓸 수 없습니다(PostgREST가 함수호출 문법으로 오인해서 파싱 실패). 이런 컬럼으로 걸러야 할 땐 전체를 읽어서 JS에서 필터링하세요 (`lib/auth-helpers.ts`의 `getViewerStaffRecord()` 참고).
- **구글시트 데이터는 3행부터**: 1행은 병합된 제목, 2행은 헤더, 실제 데이터는 3행부터 시작합니다.
- **Tailwind 유틸 충돌 주의**: `lib/ui.ts`의 공용 `input` 상수는 `w-full`로 시작합니다. 폭을 다르게 주고 싶으면 `input`이 아니라 `inputBase` + 원하는 `w-*` 하나만 조합하세요(`w-full`과 `w-auto`처럼 같은 명시도의 클래스가 같이 있으면 JSX 순서가 아니라 생성된 스타일시트 순서로 승자가 갈립니다).
- **`dynamic = 'force-dynamic'`**: 모든 페이지에 걸려 있음 — 정적 캐싱 때문에 오래된 데이터가 보이는 걸 방지하기 위함. 새 페이지 만들 때도 유지하세요.
- **Server Action을 클라이언트 컴포넌트에서 직접 함수 호출**: `<form action={...}>` 방식이 아니라 직접 호출하는 경우가 있음(예: `WeeklyTaskCalendar.tsx`) — 페이지 전체 `revalidatePath` 없이 부분 갱신이 필요할 때 씀.

## 참고 문서
- `z:\공유 드라이브\서대문노인종합복지관\업무포털\prd.md` — 요구사항/작업 이력 로그
- `z:\공유 드라이브\서대문노인종합복지관\업무포털\portal-webapp\Code.js`, `Index.html` — 원본 Apps Script 앱(참고용, 더 이상 운영 안 함)
