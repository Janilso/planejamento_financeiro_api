import { Model } from 'mongoose';
import { getErrorMongo } from '../config';
import { BalanceBaseType, BalanceDocument, BalanceType } from '../models';
import { addMonths } from 'date-fns';
import { dateToMonthYear } from '../utils';
import { GetBalanceResponse, GetBalancesType } from './types';
import { BalanceLean } from '../models/balance.model';

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
        listInstallments: this._generateListInstallments(balance),
      });
      return balanceCreated;
    } catch (error) {
      getErrorMongo(error, 'Erro ao salvar ganho ou gasto');
    }
  }

  async getAllByUserId(userId: string) {
    try {
      const balancesLean = await this.balanceModel
        .find({ userId })
        .lean<BalanceLean[]>();
      const balances = balancesLean.reduce<GetBalancesType[]>(
        (acc, balance) => [...acc, ...this._factoryGetBalanceResponse(balance)],
        [],
      );
      const response = this._generateListInstallmentsByUser(balances);
      return response;
    } catch (error) {
      getErrorMongo(error, 'Erro ao buscar ganhos ou gastos do usuário');
    }
  }

  async getById(id: string) {
    try {
      const balance = await this.balanceModel.findById(id).lean();
      return balance;
    } catch (error) {
      getErrorMongo(error, 'Erro ao buscar ganho ou gasto');
    }
  }

  _generateListInstallments(balance: BalanceType): BalanceBaseType[] {
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

  _generateListInstallmentsByUser(
    balances: GetBalancesType[],
  ): GetBalanceResponse {
    return balances.reduce<GetBalanceResponse>((acc, balance) => {
      const monthYear = dateToMonthYear(balance.date).toLocaleUpperCase();

      const accGains = acc[monthYear]?.gains ?? [];
      const accExpenses = acc[monthYear]?.expenses ?? [];

      return {
        ...acc,
        [monthYear]: {
          ...acc[monthYear],
          gains: balance.type === 'gains' ? [...accGains, balance] : accGains,
          expenses:
            balance.type === 'expenses'
              ? [...accExpenses, balance]
              : accExpenses,
        },
      };
    }, {});
  }

  _factoryGetBalanceResponse(balance: BalanceLean): GetBalancesType[] {
    if (balance.totalInstallments > 1) {
      return (
        balance?.listInstallments?.map((installment) => ({
          id: balance._id?.toString(),
          name: installment.name,
          value: installment.value,
          realized: installment.realized,
          installment: installment.installment,
          totalInstallments: installment.totalInstallments,
          type: installment.type,
          date: installment.date,
        })) ?? []
      );
    }

    return [
      {
        id: balance._id.toString(),
        name: balance.name,
        value: balance.value,
        realized: balance.realized,
        installment: balance.installment,
        totalInstallments: balance.totalInstallments,
        type: balance.type,
        date: balance.date,
      },
    ];
  }
}

export default BalanceService;
