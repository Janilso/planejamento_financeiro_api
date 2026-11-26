import { Request, Response } from 'express';
import { ERROR_MESSAGES } from '../utils';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    name: 'NotFoundError',
    code: 404,
    message: ERROR_MESSAGES.ROUTE_NOT_FOUND,
    errors: [],
  });
};
