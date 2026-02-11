/**
 * Tests for custom authentication error classes
 */

import {
  AuthError,
  SteamAuthError,
  SessionError,
  UserCreationError,
  UnauthorizedError,
  ForbiddenError,
} from '../../errors/AuthErrors';

describe('AuthError Classes', () => {
  describe('AuthError (base class)', () => {
    it('should create error with all properties', () => {
      const error = new AuthError(
        500,
        'User message',
        'Technical details',
        'ERROR_CODE',
        { key: 'value' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.userMessage).toBe('User message');
      expect(error.technicalDetails).toBe('Technical details');
      expect(error.errorCode).toBe('ERROR_CODE');
      expect(error.metadata).toEqual({ key: 'value' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('AuthError');
      expect(error.message).toBe('Technical details');
    });

    it('should create error without metadata', () => {
      const error = new AuthError(
        400,
        'User message',
        'Technical details',
        'ERROR_CODE'
      );

      expect(error.metadata).toBeUndefined();
    });

    it('should convert to loggable object', () => {
      const error = new AuthError(
        500,
        'User message',
        'Technical details',
        'ERROR_CODE',
        { key: 'value' }
      );

      const logObject = error.toLogObject();

      expect(logObject).toMatchObject({
        name: 'AuthError',
        errorCode: 'ERROR_CODE',
        statusCode: 500,
        userMessage: 'User message',
        technicalDetails: 'Technical details',
        metadata: { key: 'value' },
      });
      expect(logObject.timestamp).toBeDefined();
      expect(logObject.stack).toBeDefined();
    });
  });

  describe('SteamAuthError', () => {
    it('should create Steam auth error with correct defaults', () => {
      const error = new SteamAuthError('Steam API failed', 'STEAM_API_ERROR', {
        steamId: '123',
      });

      expect(error.statusCode).toBe(500);
      expect(error.userMessage).toBe(
        'Steam authentication failed. Please try again.'
      );
      expect(error.technicalDetails).toBe('Steam API failed');
      expect(error.errorCode).toBe('STEAM_API_ERROR');
      expect(error.metadata).toEqual({ steamId: '123' });
      expect(error.name).toBe('SteamAuthError');
    });
  });

  describe('SessionError', () => {
    it('should create session error with correct defaults', () => {
      const error = new SessionError(
        'Session store failed',
        'SESSION_STORE_ERROR',
        { sessionId: 'abc' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.userMessage).toBe(
        'Session error occurred. Please try logging in again.'
      );
      expect(error.technicalDetails).toBe('Session store failed');
      expect(error.errorCode).toBe('SESSION_STORE_ERROR');
      expect(error.name).toBe('SessionError');
    });
  });

  describe('UserCreationError', () => {
    it('should create user creation error with correct defaults', () => {
      const error = new UserCreationError(
        'Database insert failed',
        'DB_INSERT_ERROR',
        { userId: '456' }
      );

      expect(error.statusCode).toBe(500);
      expect(error.userMessage).toBe(
        'Failed to create or update user account. Please try again.'
      );
      expect(error.technicalDetails).toBe('Database insert failed');
      expect(error.errorCode).toBe('DB_INSERT_ERROR');
      expect(error.name).toBe('UserCreationError');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error with 401 status', () => {
      const error = new UnauthorizedError(
        'Please log in',
        'NOT_AUTHENTICATED',
        { path: '/protected' }
      );

      expect(error.statusCode).toBe(401);
      expect(error.userMessage).toBe('Please log in');
      expect(error.technicalDetails).toBe('Authentication required');
      expect(error.errorCode).toBe('NOT_AUTHENTICATED');
      expect(error.name).toBe('UnauthorizedError');
    });
  });

  describe('ForbiddenError', () => {
    it('should create forbidden error with 403 status', () => {
      const error = new ForbiddenError(
        'Access denied',
        'INSUFFICIENT_PERMISSIONS',
        { resource: 'admin' }
      );

      expect(error.statusCode).toBe(403);
      expect(error.userMessage).toBe('Access denied');
      expect(error.technicalDetails).toBe('Access forbidden');
      expect(error.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.name).toBe('ForbiddenError');
    });
  });

  describe('Error stack traces', () => {
    it('should capture stack trace', () => {
      const error = new AuthError(
        500,
        'User message',
        'Technical details',
        'ERROR_CODE'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AuthError');
    });
  });
});
