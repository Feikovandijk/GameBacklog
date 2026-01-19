import { doubleCsrf } from 'csrf-csrf';
import { Request } from 'express';

const CSRF_SECRET =
  process.env.CSRF_SECRET || 'csrf-secret-key-change-this-in-prod';
const COOKIE_NAME = 'x-csrf-token';

export const {
  invalidCsrfTokenError, // This is the error thrown when the token is invalid
  generateCsrfToken, // This is the function to generate a new token
  doubleCsrfProtection, // This is the default CSRF protection middleware
} = doubleCsrf({
  getSecret: () => CSRF_SECRET, // A function that optionally takes the request and returns a secret
  getSessionIdentifier: (req: Request) => req.user?.id || 'anon', // Session identifier
  cookieName: COOKIE_NAME, // The name of the cookie to be used, recommend using something unique
  cookieOptions: {
    sameSite: 'lax', // Recommend 'lax' for most cases, or 'strict' if feasible
    secure: process.env.NODE_ENV === 'production', // Secure in production
    // signed: false, // Whether the cookie is signed or not (requires cookie-parser secret if true)
    path: '/',
  },
  size: 64, // The size of the generated token in bits
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // A list of request methods that properly ignore CSRF
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'], // A function that returns the token from the request
});
