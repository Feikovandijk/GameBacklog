/**
 * Global error handling middleware
 * Catches unhandled errors and formats consistent responses
 */

import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../errors/AuthErrors';
import { formatErrorResponse, getStatusCode } from '../utils/errorResponse';
import { logger } from '../utils/logger';
import { User } from '../types/steam.types';

/**
 * Global error handler middleware
 * Should be registered after all routes as the last middleware
 *
 * @param error - Error thrown during request processing
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.id || 'unknown';
  const user = req.user as User | undefined;

  // Log the error with context
  logger.error('Unhandled error in request', error, {
    requestId,
    userId: user?.id,
    steamId: user?.steam_id,
    path: req.path,
    method: req.method,
    errorCode: error instanceof AuthError ? error.errorCode : 'INTERNAL_ERROR',
  });

  // Determine status code
  const statusCode = getStatusCode(error);

  // Format error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse = formatErrorResponse(error, req, isDevelopment);

  // Send response
  res.status(statusCode).json(errorResponse);
}
