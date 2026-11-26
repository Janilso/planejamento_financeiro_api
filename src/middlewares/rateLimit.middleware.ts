import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { ERROR_MESSAGES } from '../utils';

type LimiterOptions = {
  windowMs: number;
  limit: number;
  skip?: (req: Request) => boolean;
};

// Limita as requisições por IP e responde no formato de erro da API.
export function createLimiter({ windowMs, limit, skip }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    skip,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        name: 'RateLimitError',
        code: 429,
        message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
        errors: [],
      });
    },
  });
}
