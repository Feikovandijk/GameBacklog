/**
 * Request ID middleware
 * Generates unique correlation IDs for each request to enable log tracing
 */

import { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'crypto';

export function generateRequestId(): string {
  return randomBytes(16).toString('hex');
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use existing request ID if provided, otherwise generate new one
  const requestId =
    (req.headers['x-request-id'] as string) || generateRequestId();

  // Attach to request object
  req.id = requestId;

  // Set response header for client correlation
  res.setHeader('x-request-id', requestId);

  next();
}
