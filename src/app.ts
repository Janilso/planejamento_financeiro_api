import express from 'express';
import { errorHandler } from './middlewares';
import { authRoutes, balanceRoutes } from './routes';

const app = express();

app.use(express.json());

// Routes
app.use(authRoutes);
app.use(balanceRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
