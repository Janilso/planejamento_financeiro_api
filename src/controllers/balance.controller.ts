import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares';
import BalanceService from '../services/balance.service';
import { BalanceModel, BalanceType } from '../models';

class BalanceController {
  balanceService: BalanceService;

  constructor() {
    this.balanceService = new BalanceService(BalanceModel);
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const balance = req.body as BalanceType;

    try {
      const data = await this.balanceService.create(
        req.user?.id || '',
        balance,
      );
      return res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export default BalanceController;
