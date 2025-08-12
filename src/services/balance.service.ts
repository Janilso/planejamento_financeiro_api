import { Model } from 'mongoose';
import { getErrorMongo } from '../config';
import { BalanceDocument, BalanceType } from '../models';

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
        listInstallments: [],
      });
      return balanceCreated;
    } catch (error) {
      getErrorMongo(error, 'Erro ao salvar ganho ou gasto');
    }
  }
}

export default BalanceService;
