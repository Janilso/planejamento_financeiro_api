import { Router } from 'express';
import BalanceController from '../controllers/balance.controller';
import { authMiddleware, validateBody } from '../middlewares';
import { BalanceSchema } from '../schemas';

const balanceRoutes = Router();
const balanceController = new BalanceController();

balanceRoutes.post(
  '/balances',
  authMiddleware,
  validateBody(BalanceSchema.create),
  balanceController.create.bind(balanceController),
);

balanceRoutes.get(
  '/balances',
  authMiddleware,
  balanceController.get.bind(balanceController),
);

export default balanceRoutes;
