import z from 'zod';
import { ERROR_MESSAGES } from '../utils';

const name = z.string().trim().min(1, 'Parâmetro obrigatório.');
const value = z
  .number()
  // abort: abaixo de um centavo, só a mensagem de valor mínimo.
  .min(0.01, { message: 'Valor deve ser maior que zero', abort: true })
  .multipleOf(0.01, ERROR_MESSAGES.TWO_DECIMALS);
const type = z.enum(['gains', 'expenses'], {
  error: 'Tipo deve ser gains ou expenses.',
});
const totalInstallments = z
  .number()
  .int()
  .min(0)
  .max(30, 'Máximo de 30 parcelas.');
const date = z.coerce.date().min(1, 'Parâmetro obrigatório.');

class BalanceSchema {
  static readonly create = z.object({
    name,
    value,
    realized: z.boolean().default(false),
    type,
    installment: z.number().int().min(1, 'Valor deve ser maior que zero'),
    totalInstallments: totalInstallments.optional().nullable().default(0),
    date,
  });

  // Sem valores padrão: só muda o que veio no corpo.
  static readonly update = z
    .object({
      name: name.optional(),
      value: value.optional(),
      type: type.optional(),
      totalInstallments: totalInstallments.optional(),
      date: date.optional(),
      realized: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: ERROR_MESSAGES.NOTHING_TO_UPDATE,
    });

  static readonly installmentRealized = z.object({ realized: z.boolean() });

  static readonly idParams = z.object({ id: z.string() });

  static readonly installmentParams = z.object({
    id: z.string(),
    installment: z.coerce.number().int().min(1),
  });
}

export default BalanceSchema;
