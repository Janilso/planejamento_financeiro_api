import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares';
import { AuthService } from '../services';
import { UserModel } from '../models';

class AuthController {
  authService: AuthService;

  constructor(clientId: string) {
    this.authService = new AuthService(clientId, UserModel);
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const { googleToken } = req.body;

    try {
      const data = await this.authService.login(googleToken);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    const { refreshToken } = req.body;

    try {
      const data = await this.authService.refresh(refreshToken);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await this.authService.logout(req.user?.id || '');
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
