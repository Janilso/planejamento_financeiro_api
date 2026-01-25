import { NextFunction, Request, Response } from 'express';
import { environment, TokenConfig } from '../config';
import { AppError } from './errorHandler.middleware';
import { ERROR_MESSAGES } from '../utils';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization;

  if (!token) {
    throw new AppError(401, ERROR_MESSAGES.INVALID_ACCESS, {
      name: 'ValidationError',
    });
  }

  const tokenConfig = new TokenConfig();

  try {
    const decoded = tokenConfig.verifyToken(token, environment.jwtSecretKey);

    req.user = { id: decoded?.id?.toString() };
    next();
  } catch {
    throw new AppError(403, ERROR_MESSAGES.INVALID_TOKEN, {
      name: 'AuthError',
    });
  }
};
