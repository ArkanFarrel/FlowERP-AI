'use server';

import { cookies } from 'next/headers';

/**
 * Store JWT tokens in httpOnly cookies after successful backend login/register.
 * These cookies are readable by server actions to proxy requests to the backend API.
 */
export async function setAuthCookie(accessToken: string, refreshToken?: string, userId?: string, role?: string) {
  const cookieStore = await cookies();

  // Long-lived session (1 year) so token does not expire quickly
  const ONE_YEAR = 365 * 24 * 60 * 60;

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ONE_YEAR,
  });

  if (userId) {
    cookieStore.set('auth_token', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ONE_YEAR,
    });
  }

  if (role) {
    cookieStore.set('user_role', role.toUpperCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ONE_YEAR,
    });
  }

  if (refreshToken) {
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ONE_YEAR,
    });
  }
}

/**
 * Clear all auth cookies on logout.
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  cookieStore.delete('auth_token');
  cookieStore.delete('user_role');
}

/**
 * Check if we have a valid access token cookie.
 */
export async function hasAuthCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get('access_token')?.value;
}
