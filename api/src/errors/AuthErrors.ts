/**
 * Custom error classes for authentication and authorization
 * These errors provide structured information for logging and API responses
 */

/**
 * Base authentication error class
 * All auth-related errors extend this class
 */
export class AuthError extends Error {
  public readonly timestamp: Date;

  constructor(
    public readonly statusCode: number,
    public readonly userMessage: string,
    public readonly technicalDetails: string,
    public readonly errorCode: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(technicalDetails);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to a loggable object
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      userMessage: this.userMessage,
      technicalDetails: this.technicalDetails,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Steam OAuth authentication errors
 * Thrown when Steam authentication fails
 */
export class SteamAuthError extends AuthError {
  constructor(
    technicalDetails: string,
    errorCode: string,
    metadata?: Record<string, unknown>
  ) {
    super(
      500,
      'Steam authentication failed. Please try again.',
      technicalDetails,
      errorCode,
      metadata
    );
  }
}

/**
 * Session management errors
 * Thrown when session operations fail
 */
export class SessionError extends AuthError {
  constructor(
    technicalDetails: string,
    errorCode: string,
    metadata?: Record<string, unknown>
  ) {
    super(
      500,
      'Session error occurred. Please try logging in again.',
      technicalDetails,
      errorCode,
      metadata
    );
  }
}

/**
 * User creation/update errors
 * Thrown when database operations on users fail
 */
export class UserCreationError extends AuthError {
  constructor(
    technicalDetails: string,
    errorCode: string,
    metadata?: Record<string, unknown>
  ) {
    super(
      500,
      'Failed to create or update user account. Please try again.',
      technicalDetails,
      errorCode,
      metadata
    );
  }
}

/**
 * Unauthorized access errors (401)
 * Thrown when authentication is required but not provided
 */
export class UnauthorizedError extends AuthError {
  constructor(
    userMessage: string,
    errorCode: string,
    metadata?: Record<string, unknown>
  ) {
    super(401, userMessage, 'Authentication required', errorCode, metadata);
  }
}

/**
 * Forbidden access errors (403)
 * Thrown when user is authenticated but lacks permission
 */
export class ForbiddenError extends AuthError {
  constructor(
    userMessage: string,
    errorCode: string,
    metadata?: Record<string, unknown>
  ) {
    super(403, userMessage, 'Access forbidden', errorCode, metadata);
  }
}
