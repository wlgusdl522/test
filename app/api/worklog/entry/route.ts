import { NextRequest, NextResponse } from 'next/server';
import { buildWorklogItems } from '@/lib/mutate/businessPlan';
import { setDailyEntry } from '@/lib/mutate/worklogEntry';

export const runtime = 'nodejs';

// 무료급식포털(Apps Script) 등 외부 시스템이 총괄업무일지 일일실적을 자동으로 채워 넣기 위한 연동 엔드포인트.
// 항목ID는 내부적으로 생성되는 UUID라 외부에서 알 수 없으므로, 사람이 읽을 수 있는
// 세부사업명 + 라벨(중분류 또는 소분류)로 요청받아 서버에서 buildWorklogItems로 항목ID를 찾아 매칭한다.
const 사업명 = '14. 무료급식사업';
const WRITER_EMAIL = 'free-meal-portal@sdmsenior.or.kr';
const WRITER_NAME = '무료급식포털(자동연동)';

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get('x-api-key');
  return !!key && key === process.env.WORKLOG_INGEST_KEY;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const items = await buildWorklogItems(사업명);
  return NextResponse.json({
    사업명,
    항목: items.map((i) => ({ 세부사업명: i.세부사업명, 라벨: i.소분류 || i.중분류 })),
    사용예시: {
      method: 'POST',
      headers: { 'x-api-key': '(발급된 키)', 'content-type': 'application/json' },
      body: { 세부사업명: items[0]?.세부사업명, 라벨: items[0]?.소분류 || items[0]?.중분류, 날짜: '2026-08-10', 건: 1, 명: 120 },
    },
  });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { 세부사업명, 라벨, 날짜, 건, 명 } = body ?? {};
  if (!세부사업명 || !라벨 || !/^\d{4}-\d{2}-\d{2}$/.test(날짜 ?? '')) {
    return NextResponse.json({ error: '세부사업명, 라벨, 날짜(YYYY-MM-DD)가 필요합니다.' }, { status: 400 });
  }

  const items = await buildWorklogItems(사업명);
  const item = items.find((i) => i.세부사업명 === 세부사업명 && (i.소분류 || i.중분류) === 라벨);
  if (!item) {
    return NextResponse.json(
      { error: '일치하는 항목을 찾을 수 없습니다.', 유효한항목: items.map((i) => ({ 세부사업명: i.세부사업명, 라벨: i.소분류 || i.중분류 })) },
      { status: 404 }
    );
  }

  await setDailyEntry(사업명, item.id, 날짜, Number(건) || 0, Number(명) || 0, WRITER_EMAIL, WRITER_NAME);
  return NextResponse.json({ ok: true, 항목ID: item.id });
}
