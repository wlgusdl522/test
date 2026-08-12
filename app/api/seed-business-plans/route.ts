import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireViewerEmail, isAdminEmail } from '@/lib/auth-helpers';
import { createWorklogBusiness, getWorklogBusinessNames } from '@/lib/mutate/businessPlan';
import { deleteKeyedRecord } from '@/lib/mutate/keyedTable';
import { getSheetsClient } from '@/lib/sheets/client';
import { type KeyedTableConfig } from '@/lib/sheets/keyedTable';
import { mirrorKeyedTableToSupabase } from '@/lib/supabase/keyedTable';
import { BUSINESS_PLAN_BASIS_TABLE, BUSINESS_PLAN_ITEM_TABLE, BUSINESS_SETTINGS_TABLE, BUSINESS_SUB_TABLE } from '@/lib/sheets/registry';

// 원래 PDF 표기(띄어쓰기 포함)로 이미 등록돼 있던 8개 사업 - 이 시딩 스크립트가
// 붙여쓴 이름으로 다시 만들어서 사업이 중복됐다. 붙여쓴 쪽(중복)을 정리 대상으로 삼는다.
const DUPLICATE_UNSPACED_NAMES = [
  '노년사회화교육사업', '기획 및 운영관리사업', '인적자원관리사업', '고령자취업알선사업',
  '지역복지활성화사업', '노인맞춤돌봄서비스사업', '노인일자리및사회활동지원사업', '노인자살예방센터',
];

function colLetter(n: number): string {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

// 시트 원본을 딱 한 번만 읽고, keep(유지할 기존 행) + fresh(새로 넣을 행)를 한 번의
// values.update로 통째로 다시 쓴다 - deleteRecords처럼 행 단위 batchUpdate를 수백~수천 건
// 만드는 대신, 읽기 1번 + 쓰기 1번(+ 남는 꼬리 행 clear)으로 끝내 서버리스 시간초과를 피한다.
async function replaceRows(
  config: KeyedTableConfig,
  keepFilter: (r: Record<string, string>) => boolean,
  fresh: Record<string, string>[]
): Promise<{ kept: number; fresh: number; total: number }> {
  const client = getSheetsClient();
  const lastCol = colLetter(config.headers.length);
  const res = await client.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A3:${lastCol}`,
  });
  const rawRows = (res.data.values ?? []) as string[][];
  const existing = rawRows
    .filter((row) => row[0])
    .map((row) => {
      const rec: Record<string, string> = {};
      config.headers.forEach((h, i) => { rec[h] = (row[i] ?? '').toString(); });
      return rec;
    });
  const kept = existing.filter(keepFilter);
  const combined = [...kept, ...fresh];
  const combinedRows = combined.map((rec) => config.headers.map((h) => rec[h] ?? ''));

  if (combinedRows.length > 0) {
    await client.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A3:${lastCol}${2 + combinedRows.length}`,
      valueInputOption: 'RAW',
      requestBody: { values: combinedRows },
    });
  }
  const oldEndRow = 2 + rawRows.length;
  const newEndRow = 2 + combinedRows.length;
  if (oldEndRow > newEndRow) {
    await client.spreadsheets.values.clear({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A${newEndRow + 1}:${lastCol}${oldEndRow}`,
    });
  }
  await mirrorKeyedTableToSupabase({ tableName: config.sheetName, primaryKey: config.primaryKey }, combined);
  return { kept: kept.length, fresh: fresh.length, total: combined.length };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// 인원×횟수 계산식 한 줄. direct가 있으면 직접건/직접명으로 취급.
type Basis = { 라벨?: string; 인원?: number; 횟수?: number; direct?: [number, number] };
type Item = { 제목: string; 사업내용?: string; basis: Basis[] };
type Sub = { 세부사업명: string; 기대효과?: string; items: Item[] };
type Biz = { 사업명: string; subs: Sub[] };

// 2026년도 세부사업계획서(안) 기준 - 무료급식사업/나눔참여사업은 이미 포털에 있어 제외.
const SEED: Biz[] = [
  {
    사업명: '상담사업',
    subs: [
      {
        세부사업명: '일반상담 및 회원관리',
        기대효과: '복지관 회원관리를 통한 신입회원의 정착 및 기존회원의 지속적인 활동·이용 만족도 증진',
        items: [
          { 제목: '회원가입상담', basis: [{ 인원: 7, 횟수: 100 }] },
          { 제목: '신입회원교육', basis: [{ 인원: 70, 횟수: 10 }] },
          { 제목: '이용자 운영위원회', basis: [{ 라벨: '모니터링', 인원: 5, 횟수: 6 }, { 라벨: '회의', 인원: 5, 횟수: 2 }] },
          { 제목: '신입회원 욕구조사', basis: [{ 라벨: '신입회원', 인원: 7, 횟수: 100 }, { 라벨: '신노년', 인원: 3, 횟수: 100 }] },
          { 제목: '회원 전수조사', basis: [{ 인원: 60, 횟수: 50 }] },
          { 제목: '회원정보 최신화', basis: [{ 인원: 1804, 횟수: 10 }] },
          { 제목: '회원관리', basis: [{ 라벨: '정보제공', 인원: 120, 횟수: 10 }, { 라벨: '카드재발급', 인원: 50, 횟수: 11 }] },
          { 제목: '행사 프로그램', basis: [{ 라벨: '명절행사', 인원: 150, 횟수: 2 }, { 라벨: '회원이벤트', 인원: 100, 횟수: 1 }] },
        ],
      },
      {
        세부사업명: '전문상담',
        기대효과: '지역자원 연계를 통한 전문상담 및 특강을 통해 복지관 회원의 안정된 노후생활 도모',
        items: [
          { 제목: '전문상담', basis: [{ 인원: 1, 횟수: 120 }] },
          { 제목: '상담특강', basis: [{ 라벨: '기초연금특강', 인원: 20, 횟수: 3 }, { 라벨: '웰다잉특강', 인원: 20, 횟수: 3 }, { 라벨: '뮤직테라피특강', 인원: 25, 횟수: 2 }] },
        ],
      },
      {
        세부사업명: '시니어 웰다잉동화',
        기대효과: '신노년 세대의 참여를 통한 복지관 이용 활성화 및 세대 내, 세대 간 교류 활성화',
        items: [{ 제목: '시니어웰다잉동화', basis: [{ 인원: 20, 횟수: 4 }] }],
      },
    ],
  },
  {
    사업명: '사례관리사업',
    subs: [
      {
        세부사업명: '사례관리',
        기대효과: '지역사회 내 저소득 복지 취약계층을 발굴, 선정 및 사례관리를 통해 이용자의 문제해결 능력 향상',
        items: [
          { 제목: '적격심사 및 사정', basis: [{ 인원: 80, 횟수: 1 }] },
          { 제목: '통합사례회의', basis: [{ 인원: 70, 횟수: 1 }] },
          { 제목: '이용자 선정', basis: [{ 인원: 80, 횟수: 1 }] },
          { 제목: '이용자 종결', basis: [{ 인원: 5, 횟수: 1 }] },
          { 제목: '서비스계획 및 재사정평가', basis: [{ 라벨: '서비스계획', 인원: 80, 횟수: 1 }, { 라벨: '재사정평가', 인원: 80, 횟수: 1 }] },
          { 제목: '서비스점검', basis: [{ 인원: 70, 횟수: 1 }] },
          { 제목: '이용자 상담', basis: [{ 라벨: '집중', 인원: 20, 횟수: 36 }, { 라벨: '일반', 인원: 60, 횟수: 24 }] },
          { 제목: '텔레체크', basis: [{ 인원: 22, 횟수: 110 }] },
          { 제목: '일상생활 정보제공', basis: [{ 인원: 80, 횟수: 24 }] },
          { 제목: '욕구 및 만족도 조사', basis: [{ 인원: 80, 횟수: 1 }] },
        ],
      },
      {
        세부사업명: '자원연계 및 서비스 제공',
        기대효과: '관내·외 지역사회 자원을 활용하여 이용자 욕구에 적합한 서비스 제공을 통해 정서적·경제적 지지를 도모',
        items: [
          { 제목: '무료급식', basis: [{ 라벨: '식당', 인원: 35, 횟수: 288 }, { 라벨: '도시락', 인원: 5, 횟수: 360 }, { 라벨: '밑반찬', 인원: 5, 횟수: 96 }] },
          { 제목: '후원금품', basis: [{ 인원: 80, 횟수: 14 }] },
          { 제목: '명절행사', basis: [{ 인원: 110, 횟수: 2 }] },
          { 제목: '어버이날 행사', basis: [{ 인원: 110, 횟수: 1 }] },
          { 제목: '김장행사', basis: [{ 인원: 110, 횟수: 1 }] },
          { 제목: '생신선물', basis: [{ 인원: 80, 횟수: 1 }] },
        ],
      },
      {
        세부사업명: '지역사회 네트워크',
        기대효과: '지역사회 네트워크를 통해 지역자원 확보 및 연계',
        items: [
          { 제목: '찾아가는 사업설명회', basis: [{ 인원: 100, 횟수: 5 }] },
          { 제목: '지역사회기관 교류 및 자원연계', basis: [{ direct: [65, 65] }] },
        ],
      },
      {
        세부사업명: '특화 프로그램',
        기대효과: '관계 형성 및 상호유대감 증진을 통해 사회적응력 향상을 도모',
        items: [
          { 제목: '할미공주', basis: [{ 인원: 20, 횟수: 40 }] },
          { 제목: '청춘서행', basis: [{ 인원: 20, 횟수: 6 }] },
          { 제목: '구해줘, 홈즈', basis: [{ 인원: 100, 횟수: 1 }] },
        ],
      },
    ],
  },
  {
    사업명: '건강지원사업',
    subs: [
      {
        세부사업명: '질병관리',
        기대효과: '질병에 대한 궁금증 해소 및 관리법을 습득하고 조기발견 및 예방',
        items: [
          { 제목: '의사 상담 및 교육', basis: [{ 인원: 2, 횟수: 80 }] },
          { 제목: '기초간호서비스', basis: [
            { 라벨: '활력징후', 인원: 10, 횟수: 240 }, { 라벨: '혈당검사', 인원: 10, 횟수: 240 },
            { 라벨: '기타검사', 인원: 1, 횟수: 130 }, { 라벨: '치매선별검사', 인원: 30, 횟수: 1 },
            { 라벨: '의약품 및 건강수첩', 인원: 1, 횟수: 330 }, { 라벨: '상처치료 및 응급처치', 인원: 1, 횟수: 70 },
            { 라벨: '건강상담교육', 인원: 9, 횟수: 100 },
          ] },
          { 제목: '지역사회협력', basis: [{ 라벨: '구강교육검진', 인원: 30, 횟수: 4 }, { 라벨: '지역자원연계', 인원: 30, 횟수: 4 }] },
          { 제목: '방문간호', basis: [
            { 라벨: '데이케어 방문간호', 인원: 15, 횟수: 96 }, { 라벨: '데이케어 방문교육', 인원: 20, 횟수: 3 },
            { 라벨: '데이케어 방문건강상담', 인원: 5, 횟수: 96 },
          ] },
        ],
      },
      {
        세부사업명: '스마트 건강관리',
        기대효과: '개인 스스로 건강정보를 스마트기기로 모니터링 하여 자가관리 능력을 향상',
        items: [{ 제목: '스마트 건강관리', basis: [{ 인원: 10, 횟수: 10 }] }],
      },
      {
        세부사업명: '건강증진',
        기대효과: '흔한 질환 및 건강 문제에 대한 정보를 제공하고 자가 관리 능력을 향상',
        items: [
          { 제목: '건강강좌 프로그램', basis: [{ 인원: 30, 횟수: 8 }] },
          { 제목: '치매예방 프로그램', basis: [{ 인원: 9, 횟수: 20 }] },
          { 제목: '통합 프로그램', basis: [{ 인원: 10, 횟수: 8 }] },
          { 제목: '건강정보 제공 및 홍보', basis: [{ 인원: 50, 횟수: 2 }] },
          { 제목: '욕구 및 만족도조사', basis: [{ 인원: 100, 횟수: 1 }] },
          { 제목: '집단 프로그램', basis: [{ 인원: 7, 횟수: 20 }] },
          { 제목: '건강관리 프로그램', basis: [{ 인원: 30, 횟수: 2 }] },
        ],
      },
      {
        세부사업명: '물리치료',
        기대효과: '통증부위 치료를 통해 동통을 감소시키고 정상적인 생활 유지 도모',
        items: [
          { 제목: '온열·냉치료', basis: [{ 인원: 11, 횟수: 180 }] },
          { 제목: '전기치료', basis: [{ 인원: 11, 횟수: 180 }] },
          { 제목: '운동·도수치료', basis: [{ 인원: 2, 횟수: 180 }] },
          { 제목: '특수 물리치료', basis: [{ 인원: 20, 횟수: 180 }] },
          { 제목: '운동상담·처방교육', basis: [{ 인원: 5, 횟수: 40 }] },
        ],
      },
      {
        세부사업명: '체력단련',
        기대효과: '질환의 발생 및 2차 재발을 방지하고 개인 신체능력을 향상시켜 건강한 삶을 살 수 있도록 도모',
        items: [
          { 제목: '체력단련', basis: [{ 인원: 35, 횟수: 240 }] },
          { 제목: '기기관리', basis: [{ direct: [240, 240] }] },
        ],
      },
    ],
  },
  {
    사업명: '영양지원사업',
    subs: [
      {
        세부사업명: '경로식당 중식운영',
        기대효과: '복지관 이용 어르신의 중식 문제 해결 및 건강증진에 기여',
        items: [{ 제목: '경로식당 중식 운영', basis: [{ 인원: 200, 횟수: 245 }] }],
      },
      {
        세부사업명: '식사배달',
        기대효과: '결식을 예방하고 균형 있는 영양관리 도모',
        items: [{ 제목: '식사배달 및 특식 제공', basis: [
          { 라벨: '도시락', 인원: 14, 횟수: 365 }, { 라벨: '동절기 대체식', 인원: 14, 횟수: 90 },
          { 라벨: '특식(도시락 등)', 인원: 100, 횟수: 7 }, { 라벨: '특식(경로식당)', 인원: 150, 횟수: 7 },
          { 라벨: '공휴일식', 인원: 150, 횟수: 66 },
        ] }],
      },
      {
        세부사업명: '특식데이',
        기대효과: '단조로울 수 있는 식사에 이벤트를 통해 즐거움과 활력 제공',
        items: [{ 제목: '특식데이', basis: [
          { 라벨: '생신특식', 인원: 300, 횟수: 12 }, { 라벨: '특식의 날', 인원: 300, 횟수: 6 }, { 라벨: '은빛축제 특식', 인원: 800, 횟수: 1 },
        ] }],
      },
      {
        세부사업명: '지구지킴 프로젝트',
        기대효과: '저탄소 프로그램을 통한 환경보호 실천',
        items: [{ 제목: '지구지킴 프로젝트', basis: [
          { 라벨: '클린푸드데이', 인원: 300, 횟수: 43 }, { 라벨: '그린푸드데이', 인원: 300, 횟수: 10 }, { 라벨: '환경보호강의', 인원: 32, 횟수: 1 },
        ] }],
      },
      {
        세부사업명: '교육 프로그램',
        기대효과: '영양교육, 요리교실, 영양상담을 통한 자기 관리 능력을 향상',
        items: [
          { 제목: '통합관리프로그램', basis: [{ 라벨: '영양교육', 인원: 10, 횟수: 2 }, { 라벨: '영양상담', 인원: 10, 횟수: 2 }, { 라벨: '요리교실', 인원: 10, 횟수: 1 }] },
          { 제목: '위생·안전 및 친절교육', basis: [{ 인원: 3, 횟수: 12 }] },
        ],
      },
      {
        세부사업명: '영양정보',
        기대효과: '최신 건강식생활정보와 영양주제 및 위생자료제공',
        items: [{ 제목: '영양 및 위생관련 정보 게시', basis: [{ direct: [12, 12] }] }],
      },
      {
        세부사업명: '기호도조사',
        기대효과: '이용자들의 욕구를 파악하여 차후 사업운영에 반영',
        items: [{ 제목: '기호도 및 만족도 조사', basis: [{ 인원: 100, 횟수: 1 }] }],
      },
    ],
  },
  {
    사업명: '노인자원봉사활성화사업',
    subs: [
      {
        세부사업명: '노인자원봉사활동',
        기대효과: '노인자원봉사단 활동 관리를 통한 체계적 관리 진행',
        items: [
          { 제목: '스마트봉사단 활동', basis: [{ 인원: 10, 횟수: 143 }] },
          { 제목: '시니어 인형극단 활동', basis: [{ 인원: 10, 횟수: 12 }] },
          { 제목: '경로식당 봉사단 활동', basis: [{ 인원: 5, 횟수: 240 }] },
          { 제목: '백세약손 봉사단 활동', basis: [{ 인원: 7, 횟수: 20 }] },
          { 제목: '공연봉사단', basis: [
            { 라벨: '난타', 인원: 10, 횟수: 44 }, { 라벨: '한국무용', 인원: 10, 횟수: 44 },
            { 라벨: '밸리댄스', 인원: 10, 횟수: 44 }, { 라벨: '합주', 인원: 9, 횟수: 44 },
          ] },
          { 제목: '주민 참여 활동', basis: [{ 인원: 100, 횟수: 10 }] },
          { 제목: '프렌즈봉사단 활동', basis: [
            { 라벨: '모집 및 OT', 인원: 20, 횟수: 2 }, { 라벨: '회의', 인원: 10, 횟수: 4 }, { 라벨: '교육', 인원: 15, 횟수: 4 },
            { 라벨: '봉사활동', 인원: 6, 횟수: 10 }, { 라벨: '참여자(주민)', 인원: 110, 횟수: 21 }, { 라벨: '간담회', 인원: 20, 횟수: 2 },
          ] },
          { 제목: '환경지킴봉사단 활동', basis: [
            { 라벨: '모집 및 OT', 인원: 15, 횟수: 2 }, { 라벨: '회의', 인원: 10, 횟수: 4 }, { 라벨: '교육', 인원: 10, 횟수: 4 },
            { 라벨: '봉사활동', 인원: 6, 횟수: 10 }, { 라벨: '간담회', 인원: 15, 횟수: 2 }, { 라벨: '참여자(주민)', 인원: 150, 횟수: 10 }, { 라벨: '조사연구', 인원: 100, 횟수: 1 },
          ] },
        ],
      },
      {
        세부사업명: '시니어기자단',
        기대효과: '노인의 능력개발 및 역량강화를 통한 사회참여 활동 기회 제공',
        items: [
          { 제목: 'OT 및 발대식', basis: [{ 인원: 25, 횟수: 1 }] },
          { 제목: '기자양성교육', basis: [{ 라벨: '전문교육', 인원: 15, 횟수: 2 }, { 라벨: '신입교육', 인원: 5, 횟수: 4 }] },
          { 제목: '취재활동', basis: [{ direct: [12, 300] }] },
          { 제목: '신문제작', basis: [{ 라벨: '신문발행', direct: [3, 15000] }, { 라벨: '신문배포', direct: [3, 15000] }, { 라벨: '특간호발행', direct: [1, 4000] }, { 라벨: '특간호배포', direct: [1, 4000] }] },
          { 제목: '회의 및 워크숍', basis: [{ 라벨: '회의', 인원: 20, 횟수: 6 }, { 라벨: '워크숍', 인원: 15, 횟수: 1 }] },
          { 제목: '성과보고회 및 평가회', basis: [{ 인원: 30, 횟수: 1 }] },
        ],
      },
      {
        세부사업명: '노인자원봉사관리',
        기대효과: '자원봉사자 모집과 배치, 상담과 리더 관리 및 역량 강화 진행',
        items: [
          { 제목: '노인자원봉사자 개발 및 상담', basis: [{ 라벨: '봉사단 홍보', direct: [22, 22] }, { 라벨: '상담', 인원: 10, 횟수: 12 }] },
          { 제목: '자원봉사단 역량강화', basis: [{ 라벨: '교육', 인원: 100, 횟수: 2 }, { 라벨: '간담회', 인원: 110, 횟수: 2 }] },
          { 제목: '지지 및 예우 프로그램', basis: [{ 라벨: '감사의날', 인원: 80, 횟수: 1 }, { 라벨: '우수봉사자선정', direct: [12, 12] }] },
          { 제목: '1-DAY 봉사활동(신노년)', basis: [{ 인원: 10, 횟수: 10 }] },
          { 제목: '욕구 및 만족도 조사', basis: [{ 인원: 100, 횟수: 1 }] },
        ],
      },
    ],
  },
  {
    사업명: '지역문화사업',
    subs: [
      {
        세부사업명: '도서관리',
        기대효과: '다양한 분야의 도서를 정기적으로 구입 및 교체, 순환관리 등을 통해 이용자의 독서 함양 능력을 고취',
        items: [{ 제목: '도서 구입 및 교체', basis: [{ 라벨: '도서구입', 인원: 7, 횟수: 10 }, { 라벨: '순회도서·후원잡지 교체', 인원: 300, 횟수: 4 }] }],
      },
      {
        세부사업명: '도서실 운영 및 관리',
        기대효과: '도서실 이용자를 위한 환경을 조성',
        items: [
          { 제목: '자율정보검색대', basis: [{ 인원: 30, 횟수: 240 }] },
          { 제목: '도서실 운영', basis: [{ 인원: 20, 횟수: 250 }] },
        ],
      },
      {
        세부사업명: '은빛축제',
        기대효과: '어르신 및 지역주민간의 연대감 조성과 바람직한 문화 형성',
        items: [{ 제목: '서대문 은빛축제', basis: [{ 인원: 900, 횟수: 1 }] }],
      },
      {
        세부사업명: 'ESG',
        기대효과: 'ESG경영 실천을 통한 투명경영 및 지역사회 내 지속가능 발전 도모',
        items: [{ 제목: 'ESG 사업', basis: [{ 인원: 400, 횟수: 1 }] }],
      },
    ],
  },
  {
    사업명: '권익증진사업',
    subs: [
      {
        세부사업명: '권익증진 활동',
        기대효과: '노인의 권익증진을 위한 다양한 활동을 수행함으로써, 노인의 권리와 이익 증진을 도모',
        items: [
          { 제목: '권익증진 교육', basis: [{ 인원: 30, 횟수: 6 }] },
          { 제목: '이용자 고충처리', basis: [{ direct: [250, 250] }] },
          { 제목: '노인인권함 운영', basis: [{ direct: [500, 500] }] },
          { 제목: '민원사무편람 제작', basis: [{ direct: [20, 20] }] },
          { 제목: '권익증진 캠페인', basis: [{ 인원: 250, 횟수: 3 }] },
          { 제목: '보행보조기 대여 및 관리', basis: [{ 인원: 147, 횟수: 1 }] },
        ],
      },
      {
        세부사업명: '권익증진 활동가 운영',
        기대효과: '권익증진 활동가 전문인력 양성을 통한 노인 및 세대 간 노인인권 인식 개선',
        items: [
          { 제목: '활동가 교육 및 회의', basis: [{ 인원: 5, 횟수: 22 }] },
          { 제목: '서포터즈 활동', basis: [{ 인원: 5, 횟수: 24 }] },
        ],
      },
    ],
  },
];

function goalFromBasis(b: Basis): [number, number] {
  if (b.direct) return b.direct;
  const 인원 = b.인원 || 0;
  const 횟수 = b.횟수 || 0;
  return [횟수, 인원 * 횟수];
}

async function readAllRaw(config: KeyedTableConfig): Promise<Record<string, string>[]> {
  const client = getSheetsClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A3:${colLetter(config.headers.length)}`,
  });
  return ((res.data.values ?? []) as string[][])
    .filter((row) => row[0])
    .map((row) => {
      const rec: Record<string, string> = {};
      config.headers.forEach((h, i) => { rec[h] = (row[i] ?? '').toString(); });
      return rec;
    });
}

export async function GET(request: Request) {
  const email = await requireViewerEmail();
  if (!(await isAdminEmail(email))) {
    return NextResponse.json({ error: '관리자만 실행할 수 있습니다.' }, { status: 403 });
  }

  const bizNames = new Set(SEED.map((b) => b.사업명));
  const [allSubs, allItems, allBasis] = await Promise.all([
    readAllRaw(BUSINESS_SUB_TABLE),
    readAllRaw(BUSINESS_PLAN_ITEM_TABLE),
    readAllRaw(BUSINESS_PLAN_BASIS_TABLE),
  ]);
  const mySubs = allSubs.filter((s) => bizNames.has(s.사업명));

  const { searchParams } = new URL(request.url);

  if (searchParams.get('cleanup') === 'dupes') {
    const dupeNames = new Set(DUPLICATE_UNSPACED_NAMES);
    const dupeSubs = allSubs.filter((s) => dupeNames.has(s.사업명));
    const dupeSubIds = new Set(dupeSubs.map((s) => s.id));
    const dupeItems = allItems.filter((i) => dupeSubIds.has(i.세부사업ID));
    const dupeItemIds = new Set(dupeItems.map((i) => i.id));

    const basisResult = await replaceRows(BUSINESS_PLAN_BASIS_TABLE, (r) => !dupeItemIds.has(r.계획항목ID), []);
    const itemResult = await replaceRows(BUSINESS_PLAN_ITEM_TABLE, (r) => !dupeSubIds.has(r.세부사업ID), []);
    const subResult = await replaceRows(BUSINESS_SUB_TABLE, (r) => !dupeNames.has(r.사업명), []);
    for (const name of DUPLICATE_UNSPACED_NAMES) {
      await deleteKeyedRecord(BUSINESS_SETTINGS_TABLE, { 사업명: name }).catch(() => {});
    }

    return NextResponse.json({
      mode: 'cleanup-dupes',
      removed: { subs: dupeSubs.length, items: dupeItems.length },
      sheetTotals: { subs: subResult.total, items: itemResult.total, basis: basisResult.total },
    });
  }

  if (searchParams.get('check') === '1') {
    const byBusiness = new Map<string, number>();
    allSubs.forEach((s) => byBusiness.set(s.사업명, (byBusiness.get(s.사업명) || 0) + 1));
    const itemsBySubId = new Map<string, number>();
    allItems.forEach((i) => itemsBySubId.set(i.세부사업ID, (itemsBySubId.get(i.세부사업ID) || 0) + 1));
    const itemsByBusiness = new Map<string, number>();
    allSubs.forEach((s) => {
      itemsByBusiness.set(s.사업명, (itemsByBusiness.get(s.사업명) || 0) + (itemsBySubId.get(s.id) || 0));
    });
    return NextResponse.json({
      mode: 'check-only',
      totalSubsInSheet: allSubs.length,
      totalItemsInSheet: allItems.length,
      totalBasisInSheet: allBasis.length,
      allBusinesses: [...byBusiness.entries()].map(([name, subCount]) => ({
        사업명: name, subs: subCount, items: itemsByBusiness.get(name) || 0, isNewSeed: bizNames.has(name),
      })),
    });
  }

  // 이 라우트가 두 번 이상 호출돼도 세부사업/계획항목/산출근거가 중복되지 않도록,
  // SEED에 있는 사업명에 속한 기존 행은 걸러내고 나머지(다른 사업들)는 그대로 유지한 채
  // 한 번의 시트 재작성으로 교체한다.
  const staleSubIds = new Set(mySubs.map((s) => s.id));
  const staleItems = allItems.filter((i) => staleSubIds.has(i.세부사업ID));
  const staleItemIds = new Set(staleItems.map((i) => i.id));

  const existing = new Set(await getWorklogBusinessNames());
  const created: string[] = [];
  for (const biz of SEED) {
    if (!existing.has(biz.사업명)) {
      await createWorklogBusiness(biz.사업명, [], new Map());
      created.push(biz.사업명);
    }
  }

  const subRecords: Record<string, string>[] = [];
  const itemRecords: Record<string, string>[] = [];
  const basisRecords: Record<string, string>[] = [];

  let subCount = 0;
  let itemCount = 0;
  let basisCount = 0;

  for (const biz of SEED) {
    biz.subs.forEach((sub, subIdx) => {
      const subId = randomUUID();
      subRecords.push({
        id: subId, 사업명: biz.사업명, 세부사업명: sub.세부사업명,
        기대효과: sub.기대효과 || '', 정렬순서: String(subIdx + 1),
      });
      subCount++;

      sub.items.forEach((item, itemIdx) => {
        const itemId = randomUUID();
        // 모든 계획항목은 merge로 등록 - 인원×횟수 세부 계산줄이 여러 개여도
        // 총괄업무일지에는 항목당 목표 하나(건=최댓값, 명=합계)로만 집계되게 한다.
        // (세부 계산줄까지 매일 따로 실적 입력하게 만들면 현실적으로 관리가 안 됨)
        itemRecords.push({
          id: itemId, 세부사업ID: subId, 제목: item.제목, 표기방식: 'merge',
          예산: '0', 사업내용: item.사업내용 || '', 정렬순서: String(itemIdx + 1),
        });
        itemCount++;

        item.basis.forEach((b, basisIdx) => {
          const [건, 명] = goalFromBasis(b);
          const basisId = randomUUID();
          basisRecords.push({
            id: basisId, 계획항목ID: itemId, 라벨: b.라벨 || '',
            직접입력여부: b.direct ? 'Y' : 'N',
            인원: String(b.인원 || 0), 횟수: String(b.횟수 || 0),
            단위: '회', 직접건: String(건), 직접명: String(명),
            정렬순서: String(basisIdx + 1),
          });
          basisCount++;
        });
      });
    });
  }

  const subResult = await replaceRows(BUSINESS_SUB_TABLE, (r) => !bizNames.has(r.사업명), subRecords);
  const itemResult = await replaceRows(BUSINESS_PLAN_ITEM_TABLE, (r) => !staleSubIds.has(r.세부사업ID), itemRecords);
  const basisResult = await replaceRows(BUSINESS_PLAN_BASIS_TABLE, (r) => !staleItemIds.has(r.계획항목ID), basisRecords);

  return NextResponse.json({
    createdBusinesses: created,
    counts: { businesses: SEED.length, subs: subCount, items: itemCount, basis: basisCount },
    sheetTotals: { subs: subResult.total, items: itemResult.total, basis: basisResult.total },
  });
}
