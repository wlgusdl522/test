'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const NAV_LAYOUT_COOKIE = 'nav_layout';

export async function getNavLayout(): Promise<'top' | 'left'> {
  const store = await cookies();
  return store.get(NAV_LAYOUT_COOKIE)?.value === 'left' ? 'left' : 'top';
}

export async function setNavLayoutAction(formData: FormData) {
  const layout: 'top' | 'left' = formData.get('layout') === 'left' ? 'left' : 'top';
  const store = await cookies();
  store.set(NAV_LAYOUT_COOKIE, layout, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

// 전체회의자료 화면 3개(입력/보기/발표)가 마지막으로 조회한 팀·월을 기억해서, "조회" 없이
// 그냥 다시 들어와도 지난번 보던 달이 그대로 열리게 한다(URL 쿼리가 항상 우선하고, 없을 때만 사용).
const STAFF_MEETING_TEAM_COOKIE = 'staff_meeting_team';
const STAFF_MEETING_YM_COOKIE = 'staff_meeting_ym';

export async function getStaffMeetingContext(): Promise<{ team: string; ym: string }> {
  const store = await cookies();
  return {
    team: store.get(STAFF_MEETING_TEAM_COOKIE)?.value ?? '',
    ym: store.get(STAFF_MEETING_YM_COOKIE)?.value ?? '',
  };
}

export async function setStaffMeetingContextAction(formData: FormData) {
  const team = String(formData.get('team') ?? '');
  const ym = String(formData.get('ym') ?? '');
  const redirectTo = String(formData.get('redirectTo') ?? '/staff-meeting');
  const store = await cookies();
  if (team) store.set(STAFF_MEETING_TEAM_COOKIE, team, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  if (ym) store.set(STAFF_MEETING_YM_COOKIE, ym, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });

  const params = new URLSearchParams();
  if (team) params.set('team', team);
  if (ym) params.set('ym', ym);
  redirect(`${redirectTo}?${params.toString()}`);
}
