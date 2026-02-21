import { NextFunction, Request, RequestHandler, Response } from 'express';
import { passport } from '../auth/steam-auth';
import config from '../config';

export const login = passport.authenticate('steam');

export const returnAuth: RequestHandler[] = [
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Hitting /auth/steam/return');
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    next();
  },
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req: Request, res: Response) => {
    console.log('Steam auth successful. Session:', req.sessionID);
    console.log('User:', req.user ? 'Authenticated' : 'Not Authenticated');
    res.redirect(`${config.frontendUrl}/dashboard`);
  },
];

export const logout = (req: Request, res: Response) => {
  req.logout(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    // Destroy the session completely from the store
    req.session.destroy(sessionErr => {
      if (sessionErr) {
        console.error('Session destruction failed:', sessionErr);
      }

      const cookieOptions = {
        path: '/',
        secure: config.isProduction,
        httpOnly: true,
        sameSite: 'lax' as const,
      };
      const cookieName = 'connect.sid';

      // Clear host-only cookie
      res.clearCookie(cookieName, cookieOptions);

      // Clear domain-specific cookies to handle potential duplicates
      const cookieDomain = process.env.COOKIE_DOMAIN;
      if (cookieDomain) {
        const domains = [cookieDomain];
        if (cookieDomain.startsWith('.')) {
          domains.push(cookieDomain.substring(1));
        }

        domains.forEach(domain => {
          res.clearCookie(cookieName, { ...cookieOptions, domain });
        });
      }

      res.json({ success: true });
    });
  });
};

export const getMe = (req: Request, res: Response) => {
  if (req.isAuthenticated() && req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};
