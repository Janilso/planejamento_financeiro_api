import { Router } from 'express';
import BalanceController from '../controllers/balance.controller';
import { asyncHandler, authMiddleware, validateBody } from '../middlewares';
import { BalanceSchema } from '../schemas';

const balanceRoutes = Router();
const balanceController = new BalanceController();

balanceRoutes.post(
  '/balances',
  authMiddleware,
  validateBody(BalanceSchema.create),
  asyncHandler(balanceController.create.bind(balanceController)),
);

balanceRoutes.get(
  '/balances',
  authMiddleware,
  asyncHandler(balanceController.get.bind(balanceController)),
);

export default balanceRoutes;
