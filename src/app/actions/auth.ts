'use server';

import { redirect } from 'next/navigation';
import { verifyPassword, createSessionToken, setSessionCookie, clearSessionCookie } from '@/lib/auth/session';

export interface AuthActionResult {
  success?: boolean;
  error?: string;
}

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get('password');

  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    return { error: 'Please enter the family password.' };
  }

  const isValid = await verifyPassword(password);
  if (!isValid) {
    return { error: 'Invalid password. Please try again.' };
  }

  const token = await createSessionToken();
  await setSessionCookie(token);

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
