import { Model } from 'mongoose';
import { getErrorMongo } from '../config';
import { AppError } from '../middlewares';
import { BalanceBaseType, BalanceDocument, BalanceType } from '../models';
import { tz } from '@date-fns/tz';
import { addMonths } from 'date-fns';
import { BalanceChanges, GetBalanceResponse, GetBalancesType } from './types';
import { BalanceLean } from '../models/balance.model';
import { APP_TIME_ZONE, dateToMonthYear, ERROR_MESSAGES } from '../utils';

class BalanceService {
  constructor(private readonly balanceModel: Model<BalanceDocument>) {}

  async create(userId: string, balance: BalanceType) {
    try {
      this.assertCentsPerInstallment(
        balance.value,
        balance?.totalInstallments ?? 0,
      );
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
      this.rethrow(error, 'Erro ao salvar ganho ou gasto');
    }
  }

  async getAllByUserId(userId: string) {
    try {
      const balancesLean = await this.balanceModel
        .find({ userId })
        .lean<BalanceLean[]>();
      const balances = balancesLean.reduce<GetBalancesType[]>(
        (acc, balance) => [...acc, ...this.factoryGetBalanceResponse(balance)],
        [],
      );
      const response = this.generateListInstallmentsByUser(balances);
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

  async update(userId: string, id: string, changes: BalanceChanges) {
    try {
      const balance = await this.findOwned(userId, id);
      const nextTotal = changes.totalInstallments ?? balance.totalInstallments;
      // Em parcelado, o realizado é de cada parcela (rota da parcela).
      if (changes.realized !== undefined && nextTotal > 1) {
        throw this.validationError(
          'realized',
          ERROR_MESSAGES.REALIZED_BY_INSTALLMENT,
        );
      }
      this.assertCentsPerInstallment(changes.value ?? balance.value, nextTotal);

      const previousInstallments = balance.listInstallments ?? [];
      const rebuildSeries =
        changes.value !== undefined ||
        changes.totalInstallments !== undefined ||
        changes.date !== undefined;

      if (changes.name !== undefined) balance.name = changes.name;
      if (changes.value !== undefined) balance.value = changes.value;
      if (changes.type !== undefined) balance.type = changes.type;
      if (changes.totalInstallments !== undefined)
        balance.totalInstallments = changes.totalInstallments;
      if (changes.date !== undefined) balance.date = changes.date.toISOString();
      if (changes.realized !== undefined) balance.realized = changes.realized;

      if (balance.totalInstallments <= 1) {
        // Parcelado virando à vista: herda o realizado da parcela 1.
        const first = previousInstallments.find((i) => i.installment === 1);
        if (changes.realized === undefined && first) {
          balance.realized = first.realized;
        }
        balance.listInstallments = [];
      } else if (rebuildSeries) {
        // Reconstrói a série inteira, mantendo o "realizado" pelo número da parcela.
        const realizedByNumber = new Map(
          previousInstallments.map((i) => [i.installment, i.realized]),
        );
        // À vista virando parcelado: as parcelas herdam o realizado do lançamento.
        const defaultRealized =
          previousInstallments.length === 0 ? balance.realized : false;
        balance.listInstallments = this.generateListInstallments({
          name: balance.name,
          value: balance.value,
          type: balance.type,
          totalInstallments: balance.totalInstallments,
          date: balance.date,
          realized: false,
          installment: 1,
        }).map((i) => ({
          ...i,
          realized: realizedByNumber.get(i.installment) ?? defaultRealized,
        }));
      } else {
        for (const installment of balance.listInstallments ?? []) {
          installment.name = balance.name;
          installment.type = balance.type;
        }
      }

      balance.updatedAt = new Date().toISOString();
      return await balance.save();
    } catch (error) {
      this.rethrow(error, 'Erro ao atualizar ganho ou gasto');
    }
  }

  async setInstallmentRealized(
    userId: string,
    id: string,
    installmentNumber: number,
    realized: boolean,
  ) {
    try {
      const balance = await this.findOwned(userId, id);
      const installment = (balance.listInstallments ?? []).find(
        (i) => i.installment === installmentNumber,
      );
      if (!installment) {
        throw new AppError(404, ERROR_MESSAGES.INSTALLMENT_NOT_FOUND, {
          name: 'NotFoundError',
        });
      }

      installment.realized = realized;
      balance.updatedAt = new Date().toISOString();
      return await balance.save();
    } catch (error) {
      this.rethrow(error, 'Erro ao atualizar parcela');
    }
  }

  async delete(userId: string, id: string) {
    try {
      const { deletedCount } = await this.balanceModel.deleteOne({
        _id: id,
        userId,
      });
      if (deletedCount === 0) throw this.balanceNotFound();
    } catch (error) {
      this.rethrow(error, 'Erro ao excluir ganho ou gasto');
    }
  }

  async deleteInstallment(
    userId: string,
    id: string,
    installmentNumber: number,
  ) {
    try {
      const balance = await this.findOwned(userId, id);
      const remaining = (balance.listInstallments ?? []).filter(
        (i) => i.installment !== installmentNumber,
      );
      if (remaining.length === (balance.listInstallments ?? []).length) {
        throw new AppError(404, ERROR_MESSAGES.INSTALLMENT_NOT_FOUND, {
          name: 'NotFoundError',
        });
      }

      if (remaining.length === 0) {
        await this.balanceModel.deleteOne({ _id: id, userId });
        return;
      }
      balance.listInstallments = remaining;
      balance.updatedAt = new Date().toISOString();
      await balance.save();
    } catch (error) {
      this.rethrow(error, 'Erro ao excluir parcela');
    }
  }

  // Cada parcela precisa valer pelo menos R$ 0,01.
  private assertCentsPerInstallment(value: number, totalInstallments: number) {
    const parts = Math.max(totalInstallments, 1);
    if (Math.round(value * 100) < parts) {
      throw this.validationError('value', ERROR_MESSAGES.MIN_PER_INSTALLMENT);
    }
  }

  private validationError(field: string, message: string) {
    return new AppError(400, ERROR_MESSAGES.VALIDATION, {
      name: 'ValidationError',
      errors: [{ field, message }],
    });
  }

  // Só encontra lançamentos do próprio usuário; o de outro usuário vira 404.
  private async findOwned(userId: string, id: string) {
    const balance = await this.balanceModel.findOne({ _id: id, userId });
    if (!balance) throw this.balanceNotFound();
    return balance;
  }

  private balanceNotFound() {
    return new AppError(404, ERROR_MESSAGES.BALANCE_NOT_FOUND, {
      name: 'NotFoundError',
    });
  }

  private rethrow(error: unknown, defaultMessage: string): never {
    if (error instanceof AppError) throw error;
    getErrorMongo(error, defaultMessage);
  }

  private generateListInstallments(balance: BalanceType): BalanceBaseType[] {
    if (balance?.totalInstallments > 1) {
      const total = balance.totalInstallments;
      // Divide em centavos; o resto da divisão vai para a última parcela.
      const cents = Math.round(balance.value * 100);
      const baseCents = Math.floor(cents / total);
      const lastCents = cents - baseCents * (total - 1);

      return Array.from({ length: total }).map((_, i) => {
        const installment = i + 1;
        // Soma os meses no calendário de São Paulo; a conversão volta para o
        // formato ISO em UTC (…Z).
        const inSaoPaulo = addMonths(new Date(balance?.date), i, {
          in: tz(APP_TIME_ZONE),
        });
        const date = new Date(inSaoPaulo.getTime()).toISOString();
        const value = (installment === total ? lastCents : baseCents) / 100;

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

  private generateListInstallmentsByUser(
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

  private factoryGetBalanceResponse(balance: BalanceLean): GetBalancesType[] {
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
          totalValue: balance.value,
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
        totalValue: balance.value,
      },
    ];
  }
}

export default BalanceService;
