import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { createHttpLogger, environment } from './config';
import { createLimiter, errorHandler, notFoundHandler } from './middlewares';
import { authRoutes, balanceRoutes } from './routes';

// Mensagens padrão do zod em português.
z.config(z.locales.pt());

const app = express();

// Atrás de um proxy (Render, Fly, nginx…), o IP real vem do X-Forwarded-For.
if (environment.trustProxy > 0) {
  app.set('trust proxy', environment.trustProxy);
}

app.use(createHttpLogger());
app.use(helmet());

const FIFTEEN_MINUTES = 15 * 60 * 1000;
app.use(
  '/auth',
  createLimiter({
    windowMs: FIFTEEN_MINUTES,
    limit: environment.rateLimitAuthMax,
  }),
);
app.use(
  createLimiter({
    windowMs: FIFTEEN_MINUTES,
    limit: environment.rateLimitApiMax,
    skip: (req) => req.path.startsWith('/auth/'),
  }),
);

app.use(express.json());

// Routes
app.use(authRoutes);
app.use(balanceRoutes);

// Rota inexistente
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
