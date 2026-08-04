'use server';

import { cookies } from 'next/headers';

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
