import { doubleCsrf } from 'csrf-csrf';
import { Request } from 'express';
import { User } from '../types/steam.types';

const CSRF_SECRET = process.env.CSRF_SECRET;

if (process.env.NODE_ENV === 'production' && !CSRF_SECRET) {
  throw new Error(
    'CSRF_SECRET environment variable must be set in production.'
  );
}

const SECRET_KEY = CSRF_SECRET || 'dev-secret-key-do-not-use-in-prod';
const COOKIE_NAME = 'x-csrf-token';

export const {
  invalidCsrfTokenError,
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => SECRET_KEY,
  getSessionIdentifier: (req: Request) => (req.user as User)?.id || 'anon',
  cookieName: COOKIE_NAME,
  cookieOptions: {
    sameSite: 'lax', // 'lax' is sufficient for same-site subdomain requests and more secure than 'none'
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'],
});
