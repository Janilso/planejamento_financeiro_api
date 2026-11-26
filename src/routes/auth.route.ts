import { Router } from 'express';
import { asyncHandler, authMiddleware, validateBody } from '../middlewares';
import { AuthController } from '../controllers';
import { environment } from '../config';
import { AuthSchema } from '../schemas';

const authRoutes = Router();
const authController = new AuthController(environment.googleClientId);

authRoutes.post(
  '/auth/login',
  validateBody(AuthSchema.login),
  asyncHandler(authController.login.bind(authController)),
);
authRoutes.post(
  '/auth/refresh',
  validateBody(AuthSchema.refresh),
  asyncHandler(authController.refresh.bind(authController)),
);
authRoutes.post(
  '/auth/logout',
  authMiddleware,
  asyncHandler(authController.logout.bind(authController)),
);

export default authRoutes;
