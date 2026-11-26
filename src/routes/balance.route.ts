import { Router } from 'express';
import BalanceController from '../controllers/balance.controller';
import {
  asyncHandler,
  authMiddleware,
  validateBody,
  validateParams,
} from '../middlewares';
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
balanceRoutes.patch(
  '/balances/:id',
  authMiddleware,
  validateParams(BalanceSchema.idParams),
  validateBody(BalanceSchema.update),
  asyncHandler(balanceController.update.bind(balanceController)),
);

balanceRoutes.patch(
  '/balances/:id/installments/:installment',
  authMiddleware,
  validateParams(BalanceSchema.installmentParams),
  validateBody(BalanceSchema.installmentRealized),
  asyncHandler(
    balanceController.setInstallmentRealized.bind(balanceController),
  ),
);

balanceRoutes.delete(
  '/balances/:id',
  authMiddleware,
  validateParams(BalanceSchema.idParams),
  asyncHandler(balanceController.delete.bind(balanceController)),
);

balanceRoutes.delete(
  '/balances/:id/installments/:installment',
  authMiddleware,
  validateParams(BalanceSchema.installmentParams),
  asyncHandler(balanceController.deleteInstallment.bind(balanceController)),
);

export default balanceRoutes;
