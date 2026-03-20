import { NextFunction, Request, Response } from 'express';
import { asyncHandler } from './asyncHandler';

describe('asyncHandler', () => {
  it('passes resolved handlers through without calling next', async () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;
    const handler = jest.fn().mockResolvedValue('ok');

    await asyncHandler(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards rejected promises to next', async () => {
    const error = new Error('boom');
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;
    const handler = jest.fn().mockRejectedValue(error);

    await asyncHandler(handler)(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
