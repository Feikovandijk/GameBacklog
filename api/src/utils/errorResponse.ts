/**
 * Error response formatting utility
 * Provides consistent error response structure across the API
 */

import { Request } from 'express';
import { AuthError } from '../errors/AuthErrors';

export interface ErrorResponse {
  error: string; // User-facing message
  errorCode: string; // Machine-readable code
  details?: string; // Technical details (dev mode only)
  requestId?: string; // For correlation
  timestamp: string; // ISO timestamp
  metadata?: Record<string, unknown>; // Extra metadata for development/debugging
  stack?: string; // Stack trace in development mode
}

/**
 * Format an error into a standardized API response
 *
 * @param error - Error to format (can be AuthError or generic Error)
 * @param req - Express request object (for request ID)
 * @param isDevelopment - Whether to include technical details
 * @returns Formatted error response object
 */
export function formatErrorResponse(
  error: Error | AuthError,
  req: Request,
  isDevelopment: boolean = false
): ErrorResponse {
  const response: ErrorResponse = {
    error: 'An error occurred',
    errorCode: 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
  };

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  // Handle custom AuthError instances
  if (error instanceof AuthError) {
    response.error = error.userMessage;
    response.errorCode = error.errorCode;

    // Include technical details in development mode
    if (isDevelopment) {
      response.details = error.technicalDetails;

      // Include metadata if present
      if (error.metadata && Object.keys(error.metadata).length > 0) {
        response.metadata = error.metadata;
      }
    }
  } else {
    // Handle generic Error instances
    response.error = isDevelopment
      ? error.message
      : 'An unexpected error occurred';
    response.errorCode = 'INTERNAL_ERROR';

    if (isDevelopment) {
      response.details = error.message;
      response.stack = error.stack;
    }
  }

  return response;
}

/**
 * Extract error code from AuthError or return default
 *
 * @param error - Error to extract code from
 * @returns Error code string
 */
export function getErrorCode(error: Error | AuthError): string {
  if (error instanceof AuthError) {
    return error.errorCode;
  }
  return 'INTERNAL_ERROR';
}

/**
 * Extract HTTP status code from AuthError or return 500
 *
 * @param error - Error to extract status from
 * @returns HTTP status code
 */
export function getStatusCode(error: Error | AuthError): number {
  if (error instanceof AuthError) {
    return error.statusCode;
  }
  return 500;
}
