import { BalanceBaseType } from '../models';

export type GetBalancesType = Omit<BalanceBaseType, 'userId'> & {
  id: string;
  totalValue: number;
};

export type BalanceChanges = {
  name?: string;
  value?: number;
  type?: string;
  totalInstallments?: number;
  date?: Date;
  realized?: boolean;
};
export type GetBalanceResponse = Record<
  string,
  { gains: GetBalancesType[]; expenses: GetBalancesType[] }
>;
