import { NextRequest, NextResponse } from 'next/server';
import { setMemo } from '@/lib/mutate/worklogEntry';

export const runtime = 'nodejs';

// /api/worklog/entry는 세부사업명/라벨 단위의 건·명 실적을 다루고, 활동내용/특이사항은
// 세부사업명·라벨과 무관하게 사업명+날짜 단위로만 저장되는 별개 데이터라 엔드포인트를 분리한다.
const 사업명 = '무료급식사업';
const WRITER_EMAIL = 'free-meal-portal@sdmsenior.or.kr';
const WRITER_NAME = '무료급식포털(자동연동)';

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get('x-api-key');
  return !!key && key === process.env.WORKLOG_INGEST_KEY;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { 날짜, 활동내용, 특이사항 } = body ?? {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(날짜 ?? '')) {
    return NextResponse.json({ error: '날짜(YYYY-MM-DD)가 필요합니다.' }, { status: 400 });
  }

  await setMemo(사업명, 날짜, 활동내용 ?? '', 특이사항 ?? '', WRITER_EMAIL, WRITER_NAME);
  return NextResponse.json({ ok: true });
}
