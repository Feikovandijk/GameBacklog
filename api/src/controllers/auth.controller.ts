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

      const isProduction = process.env.NODE_ENV === 'production';

      // Clear host-only cookie (when domain is not specified)
      res.clearCookie('connect.sid', {
        path: '/',
        secure: isProduction,
        httpOnly: true,
        sameSite: 'lax',
      });

      // Clear cookie explicitly for the configured domain
      if (process.env.COOKIE_DOMAIN) {
        res.clearCookie('connect.sid', {
          domain: process.env.COOKIE_DOMAIN,
          path: '/',
          secure: isProduction,
          httpOnly: true,
          sameSite: 'lax',
        });

        // Also clear domain without leading dot if it has one (or with dot if it doesn't)
        // just to be completely sure we remove any duplicate cookies.
        if (process.env.COOKIE_DOMAIN.startsWith('.')) {
          res.clearCookie('connect.sid', {
            domain: process.env.COOKIE_DOMAIN.substring(1),
            path: '/',
            secure: isProduction,
            httpOnly: true,
            sameSite: 'lax',
          });
        }
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
