import { NextFunction, Request, Response } from 'express';
import { ZodObject } from 'zod';
import { AppError } from './errorHandler.middleware';
import { ERROR_MESSAGES } from '../utils';

// Valida os parâmetros da rota e guarda o resultado em res.locals.params,
// porque o req.params do Express 5 não deve ser reatribuído.
export const validateParams =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return next(
        new AppError(400, ERROR_MESSAGES.VALIDATION, {
          name: 'ValidationError',
          errors: result.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        }),
      );
    }

    res.locals.params = result.data;
    next();
  };
