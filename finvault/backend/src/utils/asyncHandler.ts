import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envuelve controladores async para que sus errores lleguen al errorHandler global (A10). */
export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };
