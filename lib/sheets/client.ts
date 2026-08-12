import { google } from 'googleapis';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const impersonate = process.env.GOOGLE_IMPERSONATE_EMAIL;
  if (!email || !key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY 환경변수가 설정되지 않았습니다.');
  }
  return new google.auth.JWT({
    email,
    key,
    // 도메인 위임: 조직 외부 계정인 서비스계정을 파일마다 공유하는 대신,
    // 이미 모든 파일에 접근 권한이 있는 조직 구성원(subject)인 것처럼 호출한다.
    subject: impersonate || undefined,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      // 증명서 발행 메일 발송용 — 도메인 위임 설정에 이 스코프가 추가되어야 실제로 동작한다.
      'https://www.googleapis.com/auth/gmail.send',
    ],
  });
}

let sheets: ReturnType<typeof google.sheets> | null = null;
export function getSheetsClient() {
  if (!sheets) sheets = google.sheets({ version: 'v4', auth: getAuth() });
  return sheets;
}

let drive: ReturnType<typeof google.drive> | null = null;
export function getDriveClient() {
  if (!drive) drive = google.drive({ version: 'v3', auth: getAuth() });
  return drive;
}

let gmail: ReturnType<typeof google.gmail> | null = null;
export function getGmailClient() {
  if (!gmail) gmail = google.gmail({ version: 'v1', auth: getAuth() });
  return gmail;
}

// 탭 이름 -> gid(시트 내부 숫자 ID) 매핑. 스프레드시트 구조는 거의 안 바뀌므로 프로세스 생존 기간 동안 캐싱한다.
const gidCache = new Map<string, number>();

export async function getSheetGid(spreadsheetId: string, sheetName: string): Promise<number> {
  const cacheKey = `${spreadsheetId}::${sheetName}`;
  const cached = gidCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const res = await getSheetsClient().spreadsheets.get({ spreadsheetId });
  for (const sheet of res.data.sheets ?? []) {
    const title = sheet.properties?.title;
    const gid = sheet.properties?.sheetId;
    if (title !== undefined && gid !== undefined && gid !== null) {
      gidCache.set(`${spreadsheetId}::${title}`, gid);
    }
  }
  const found = gidCache.get(cacheKey);
  if (found === undefined) throw new Error(`시트 탭을 찾을 수 없습니다: ${sheetName}`);
  return found;
}

// 탭이 하나뿐인 스프레드시트(대장류)에서 그 탭 이름을 알아낸다 — Drive에서 생성한 파일은
// 탭 이름이 "Sheet1" 등으로 자동 지정되므로 하드코딩하지 않고 항상 조회한다.
const firstSheetTitleCache = new Map<string, string>();

export async function getFirstSheetTitle(spreadsheetId: string): Promise<string> {
  const cached = firstSheetTitleCache.get(spreadsheetId);
  if (cached !== undefined) return cached;

  const res = await getSheetsClient().spreadsheets.get({ spreadsheetId });
  const title = res.data.sheets?.[0]?.properties?.title;
  if (!title) throw new Error(`스프레드시트에 탭이 없습니다: ${spreadsheetId}`);
  firstSheetTitleCache.set(spreadsheetId, title);
  return title;
}
