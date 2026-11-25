import z from 'zod';

class BalanceSchema {
  static readonly create = z.object({
    name: z.string().trim().min(1, 'Parâmetro obrigatório.'),
    value: z.number().min(0.01, 'Valor deve ser maior que zero'),
    realized: z.boolean().default(false),
    type: z.enum(['gains', 'expenses'], {
      error: 'Tipo deve ser gains ou expenses.',
    }),
    installment: z.number().int().min(1, 'Valor deve ser maior que zero'),
    totalInstallments: z
      .number()
      .int()
      .min(0)
      .max(30, 'Máximo de 30 parcelas.')
      .optional()
      .nullable()
      .default(0),
    date: z.coerce.date().min(1, 'Parâmetro obrigatório.'),
  });
}

export default BalanceSchema;
