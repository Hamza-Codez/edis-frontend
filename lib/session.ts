import 'server-only';
import { cookies } from 'next/headers';

import type { CurrentUser } from './types';

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie) return null;
  
  try {
    const res = await fetch(`${process.env.API_ORIGIN}/auth/me`, {
      headers: {
        Cookie: `session=${sessionCookie.value}`
      },
      cache: 'no-store'
    });
    
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
