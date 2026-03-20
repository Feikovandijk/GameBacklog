import { NextFunction, Request, Response } from 'express';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  const originalNow = Date.now;

  afterEach(() => {
    Date.now = originalNow;
  });

  const createResponse = () => {
    const response = {
      status: jest.fn(),
      json: jest.fn(),
    };

    response.status.mockReturnValue(response);

    return response as unknown as Response & {
      status: jest.Mock;
      json: jest.Mock;
    };
  };

  const createRequest = (ip: string) =>
    ({
      ip,
      socket: { remoteAddress: ip },
    }) as Request;

  it('allows requests until the limit is reached', () => {
    Date.now = jest.fn(() => 1_000);

    const limiter = rateLimit(60_000, 2);
    const req = createRequest('127.0.0.1');
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 429 once the request count exceeds the limit', () => {
    Date.now = jest.fn(() => 2_000);

    const limiter = rateLimit(60_000, 2);
    const req = createRequest('192.168.1.10');
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Too many requests, please try again later.',
    });
  });

  it('resets the window after the timeout expires', () => {
    let now = 3_000;
    Date.now = jest.fn(() => now);

    const limiter = rateLimit(100, 1);
    const req = createRequest('10.0.0.5');
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    limiter(req, res, next);

    now += 101;
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });
});
