import { Request, Response } from 'express';

export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export const errorHandler = (err: HttpError, req: Request, res: Response) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
  });
};
