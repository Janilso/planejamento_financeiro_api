import { BalanceBaseType } from '../models';

export type GetBalancesType = Omit<BalanceBaseType, 'userId'> & { id: string };
export type GetBalanceResponse = Record<
  string,
  { gains: GetBalancesType[]; expenses: GetBalancesType[] }
>;
