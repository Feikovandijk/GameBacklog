/**
 * Tests for error response formatter
 */

import { Request } from 'express';
import {
  formatErrorResponse,
  getErrorCode,
  getStatusCode,
} from '../../utils/errorResponse';
import {
  AuthError,
  UnauthorizedError,
  UserCreationError,
} from '../../errors/AuthErrors';

describe('Error Response Formatter', () => {
  const mockRequest = {
    id: 'test-request-123',
  } as Request;

  describe('formatErrorResponse', () => {
    it('should format AuthError in development mode', () => {
      const error = new UnauthorizedError(
        'Please log in',
        'NOT_AUTHENTICATED',
        { path: '/protected' }
      );

      const response = formatErrorResponse(error, mockRequest, true);

      expect(response).toMatchObject({
        error: 'Please log in',
        errorCode: 'NOT_AUTHENTICATED',
        details: 'Authentication required',
        requestId: 'test-request-123',
      });
      expect(response.timestamp).toBeDefined();
      expect((response as any).metadata).toEqual({ path: '/protected' });
    });

    it('should format AuthError in production mode (no details)', () => {
      const error = new UnauthorizedError(
        'Please log in',
        'NOT_AUTHENTICATED',
        { path: '/protected' }
      );

      const response = formatErrorResponse(error, mockRequest, false);

      expect(response).toMatchObject({
        error: 'Please log in',
        errorCode: 'NOT_AUTHENTICATED',
        requestId: 'test-request-123',
      });
      expect(response.details).toBeUndefined();
      expect((response as any).metadata).toBeUndefined();
    });

    it('should format generic Error in development mode', () => {
      const error = new Error('Something went wrong');

      const response = formatErrorResponse(error, mockRequest, true);

      expect(response).toMatchObject({
        error: 'Something went wrong',
        errorCode: 'INTERNAL_ERROR',
        details: 'Something went wrong',
        requestId: 'test-request-123',
      });
      expect((response as any).stack).toBeDefined();
    });

    it('should format generic Error in production mode', () => {
      const error = new Error('Something went wrong');

      const response = formatErrorResponse(error, mockRequest, false);

      expect(response).toMatchObject({
        error: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
        requestId: 'test-request-123',
      });
      expect(response.details).toBeUndefined();
      expect((response as any).stack).toBeUndefined();
    });

    it('should handle request without ID', () => {
      const requestWithoutId = {} as Request;
      const error = new UnauthorizedError('Please log in', 'NOT_AUTHENTICATED');

      const response = formatErrorResponse(error, requestWithoutId, false);

      expect(response.requestId).toBeUndefined();
    });

    it('should not include empty metadata', () => {
      const error = new AuthError(
        500,
        'User message',
        'Technical details',
        'ERROR_CODE',
        {}
      );

      const response = formatErrorResponse(error, mockRequest, true);

      expect((response as any).metadata).toBeUndefined();
    });
  });

  describe('getErrorCode', () => {
    it('should extract error code from AuthError', () => {
      const error = new UserCreationError('DB failed', 'DB_INSERT_ERROR');

      expect(getErrorCode(error)).toBe('DB_INSERT_ERROR');
    });

    it('should return INTERNAL_ERROR for generic Error', () => {
      const error = new Error('Something went wrong');

      expect(getErrorCode(error)).toBe('INTERNAL_ERROR');
    });
  });

  describe('getStatusCode', () => {
    it('should extract status code from AuthError', () => {
      const error = new UnauthorizedError('Please log in', 'NOT_AUTHENTICATED');

      expect(getStatusCode(error)).toBe(401);
    });

    it('should return 500 for generic Error', () => {
      const error = new Error('Something went wrong');

      expect(getStatusCode(error)).toBe(500);
    });
  });
});
