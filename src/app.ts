import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares';
import { authRoutes, balanceRoutes } from './routes';

const app = express();

app.use(express.json());

// Routes
app.use(authRoutes);
app.use(balanceRoutes);

// Rota inexistente
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
