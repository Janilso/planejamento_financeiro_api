import { NextFunction, Request, Response } from 'express';
import { ERROR_MESSAGES } from '../utils';
import { NameError } from './types';

export class AppError extends Error {
  statusCode: number;
  errors: Array<Record<string, unknown>>;
  name: NameError;

  constructor(
    statusCode: number,
    message: string,
    details?: {
      name?: NameError;
      errors?: Array<Record<string, unknown>>;
    },
  ) {
    super(message);
    this.name = details?.name || 'InternalServerError';
    this.statusCode = statusCode;
    this.errors = details?.errors || [];

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('errorHandler', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      name: err.name,
      code: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  res.status(500).json({
    name: 'InternalServerError',
    code: 500,
    message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    errors: [],
  });
};

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
