import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

export const SESSION_COOKIE_NAME = 'family_vault_session';
const SESSION_EXPIRY = '7d'; // 7 days
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionPayload {
  authenticated: boolean;
  role: 'family_member';
  iat?: number;
  exp?: number;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET environment variable must be set and at least 32 characters long.');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verifies the user-submitted password against the bcrypt hash in environment variables.
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.FAMILY_PASSWORD_HASH;
  if (!hash) {
    console.error('FAMILY_PASSWORD_HASH environment variable is not configured.');
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (err) {
    console.error('Error during password verification:', err);
    return false;
  }
}

/**
 * Generates an encrypted/signed JWT session token.
 */
export async function createSessionToken(): Promise<string> {
  const secretKey = getSessionSecret();
  return new SignJWT({ authenticated: true, role: 'family_member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(secretKey);
}

/**
 * Validates a JWT session token string.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey);
    if (payload && payload.authenticated === true) {
      return payload as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sets the secure session cookie on the response.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Clears the session cookie to log out.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Retrieves and validates the current session from incoming request cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Strict server-side authorization check.
 * Throws an error if the user is unauthenticated.
 * Must be called in every Server Action and API route before any data or storage operation.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !session.authenticated) {
    throw new Error('Unauthorized: Valid family session required.');
  }
  return session;
}
