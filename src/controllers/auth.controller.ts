import { NextFunction, Request, Response } from 'express';
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
      return res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
