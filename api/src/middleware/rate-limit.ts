import { NextFunction, Request, Response } from 'express';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Basic in-memory rate limiter.
 * Cleans up expired entries on each request to avoid memory leaks.
 *
 * @param limit Window size in milliseconds
 * @param max Max requests per window
 */
export const rateLimit = (limit: number, max: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Reset if window expired or new IP
    if (!store[ip] || store[ip].resetTime < now) {
      store[ip] = {
        count: 1,
        resetTime: now + limit,
      };
      return next();
    }

    // Check limit
    if (store[ip].count >= max) {
      res.status(429).json({
        error: 'Too many requests, please try again later.',
      });
      return;
    }

    store[ip].count++;
    next();
  };
};
