import { NextFunction, Response } from 'express';
import { ZodObject } from 'zod';
import { AuthenticatedRequest } from './auth.middleware';

export const validateBody =
  (schema: ZodObject) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        errors: result.error.issues.map((err) => {
          return {
            field: err.path.join('.'),
            message: err.message,
          };
        }),
      });
    }

    req.body = result.data;

    next();
  };
