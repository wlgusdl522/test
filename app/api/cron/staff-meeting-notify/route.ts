import { NextRequest, NextResponse } from 'next/server';
import { jandiPost } from '@/lib/notify/jandi';
import { getSystemSettings } from '@/lib/mutate/settings';
import { getAllStaffMeetingInfo, markStaffMeetingNotified } from '@/lib/mutate/staffMeeting';

export const runtime = 'nodejs';

// Vercel Cron이 매일 호출한다(vercel.json). 등록된 회의 중 "오늘이 회의일시 - 알림일수전"인
// 것을 찾아 잔디 공용 채널로 안내를 보낸다. 이미 보낸 회의(알림발송일시 있음)는 건너뛴다.
function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function daysBetween(laterDate: string, earlierDate: string): number {
  const a = new Date(`${laterDate}T00:00:00Z`);
  const b = new Date(`${earlierDate}T00:00:00Z`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function nowTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [infos, settings] = await Promise.all([getAllStaffMeetingInfo(), getSystemSettings()]);
  const today = todayKst();
  const results: Record<string, 'notified' | 'skipped'> = {};

  for (const info of infos) {
    if (!info.회의일시 || info.알림발송일시) {
      results[info.년월] = 'skipped';
      continue;
    }
    const meetingDate = info.회의일시.slice(0, 10);
    const daysUntil = daysBetween(meetingDate, today);
    if (daysUntil !== info.알림일수전) {
      results[info.년월] = 'skipped';
      continue;
    }

    const message = [
      `📢 ${info.년월} 전체회의 안내`,
      info.회의일시 ? `일시: ${info.회의일시.replace('T', ' ')}` : '',
      info.장소 ? `장소: ${info.장소}` : '',
      info.진행 ? `진행: ${info.진행}` : '',
      info.참석부서 ? `참석부서: ${info.참석부서}` : '',
      '업무포털 > 업무관리 > 전체회의자료에서 자료 준비 부탁드립니다.',
    ].filter(Boolean).join('\n');

    await jandiPost(settings.staffMeetingJandiWebhook, message);
    await markStaffMeetingNotified(info.년월, info, nowTimestamp());
    results[info.년월] = 'notified';
  }

  return NextResponse.json({ result: 'ok', today, meetings: results });
}
