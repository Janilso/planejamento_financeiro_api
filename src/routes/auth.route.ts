import { Router } from 'express';
import { validateBody } from '../middlewares';
import { AuthController } from '../controllers';
import { environment } from '../config';
import { AuthSchema } from '../schemas';

const authRoutes = Router();
const authController = new AuthController(environment.googleClientId);

authRoutes.post(
  '/auth/login',
  validateBody(AuthSchema.login),
  authController.login.bind(authController),
);

export default authRoutes;
