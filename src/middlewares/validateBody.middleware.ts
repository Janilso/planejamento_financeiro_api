import { NextFunction, Response } from 'express';
import { ZodObject } from 'zod';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from './errorHandler.middleware';
import { ERROR_MESSAGES } from '../utils';

export const validateBody =
  (schema: ZodObject) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const error = new AppError(400, ERROR_MESSAGES.VALIDATION, {
        name: 'ValidationError',
        errors: result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return next(error);
    }

    req.body = result.data;

    next();
  };
