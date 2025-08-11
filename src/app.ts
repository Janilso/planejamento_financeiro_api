import express from 'express';
import { errorHandler } from './middlewares';
import { authRoutes } from './routes';

const app = express();

app.use(express.json());

// Routes
app.use(authRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
