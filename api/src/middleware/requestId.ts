/**
 * Request ID middleware
 * Generates unique correlation IDs for each request to enable log tracing
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * Generate a unique request ID
 * Uses crypto.randomBytes for better uniqueness than UUID
 *
 * @returns Unique request ID string
 */
export function generateRequestId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Middleware to attach unique request ID to each request
 * - Checks for existing x-request-id header (for request tracing)
 * - Generates new ID if not present
 * - Attaches ID to req.id for easy access
 * - Sets x-request-id response header
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
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
