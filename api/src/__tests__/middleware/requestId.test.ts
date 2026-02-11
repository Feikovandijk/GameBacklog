/**
 * Tests for request ID middleware
 */

import { Request, Response } from 'express';
import {
  requestIdMiddleware,
  generateRequestId,
} from '../../middleware/requestId';
import { createMockResponse, createMockNext } from '../utils/authHelpers';

describe('Request ID Middleware', () => {
  describe('generateRequestId', () => {
    it('should generate a 32-character hex string', () => {
      const id = generateRequestId();

      expect(id).toHaveLength(32);
      expect(id).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('requestIdMiddleware', () => {
    it('should generate and attach request ID if not present', () => {
      const req = {
        headers: {},
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      requestIdMiddleware(req, res, next);

      expect(req.id).toBeDefined();
      expect(req.id).toHaveLength(32);
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.id);
      expect(next).toHaveBeenCalled();
    });

    it('should use existing x-request-id header if present', () => {
      const existingId = 'existing-request-id-123';
      const req = {
        headers: {
          'x-request-id': existingId,
        },
      } as Partial<Request> as Request;
      const res = createMockResponse();
      const next = createMockNext();

      requestIdMiddleware(req, res, next);

      expect(req.id).toBe(existingId);
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', existingId);
      expect(next).toHaveBeenCalled();
    });

    it('should set response header with request ID', () => {
      const req = {
        headers: {},
      } as Request;
      const res = createMockResponse();
      const next = createMockNext();

      requestIdMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'x-request-id',
        expect.any(String)
      );
    });
  });
});
