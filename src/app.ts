import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { createHttpLogger, environment } from './config';
import docsRoutes from './docs/docs.route';
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
// gzip quando o cliente aceita: o histórico cresce ~90 KB por ano.
app.use(compression());

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

// Documentação: Swagger UI em /docs e o spec em /docs/openapi.json
app.use(docsRoutes);

// Rota inexistente
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
