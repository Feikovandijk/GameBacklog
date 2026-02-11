import { NextFunction, Request, RequestHandler, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
