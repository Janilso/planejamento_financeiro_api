import { Model } from 'mongoose';
import { getErrorMongo } from '../config';
import { BalanceBaseType, BalanceDocument, BalanceType } from '../models';
import { addMonths } from 'date-fns';

class BalanceService {
  constructor(private readonly balanceModel: Model<BalanceDocument>) {}

  async create(userId: string, balance: BalanceType) {
    try {
      const balanceCreated = await this.balanceModel.create({
        userId,
        name: balance.name,
        value: balance.value,
        realized: balance.realized,
        type: balance.type,
        installment: balance.installment,
        totalInstallments: balance?.totalInstallments ?? 0,
        date: balance.date,
        listInstallments: this.generateListInstallments(balance),
      });
      return balanceCreated;
    } catch (error) {
      getErrorMongo(error, 'Erro ao salvar ganho ou gasto');
    }
  }

  generateListInstallments(balance: BalanceType): BalanceBaseType[] {
    if (balance?.totalInstallments > 1) {
      return Array.from({ length: balance?.totalInstallments })?.map((_, i) => {
        const installment = i + 1;
        const date = addMonths(new Date(balance?.date), i).toISOString();
        const value = balance?.value / balance?.totalInstallments;

        const installmentObj: BalanceBaseType = {
          userId: balance?.userId,
          name: balance?.name,
          realized: balance?.realized,
          totalInstallments: balance?.totalInstallments,
          type: balance?.type,
          installment,
          value,
          date,
        };
        return installmentObj;
      });
    }

    return [];
  }
}

export default BalanceService;
