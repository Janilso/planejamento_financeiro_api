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
    const balance: BalanceType = {
      ...req.body,
      date: new Date(req.body.date).toISOString(),
    };

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

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = res.locals.params;
      const data = await this.balanceService.update(
        req.user?.id || '',
        id,
        req.body,
      );
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async setInstallmentRealized(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id, installment } = res.locals.params;
      const data = await this.balanceService.setInstallmentRealized(
        req.user?.id || '',
        id,
        installment,
        req.body.realized,
      );
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await this.balanceService.delete(
        req.user?.id || '',
        res.locals.params.id,
      );
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async deleteInstallment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id, installment } = res.locals.params;
      await this.balanceService.deleteInstallment(
        req.user?.id || '',
        id,
        installment,
      );
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await this.balanceService.getAllByUserId(req.user?.id || '');
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export default BalanceController;
