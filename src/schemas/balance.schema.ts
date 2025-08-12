import z from 'zod';

class BalanceSchema {
  static readonly create = z.object({
    name: z.string().min(1, 'Parâmetro obrigatório.'),
    value: z.number().min(1, 'Valor deve ser maior que zero'),
    realized: z.boolean().optional(),
    type: z.string().min(1, 'Parâmetro obrigatório.'),
    installment: z.number().min(1, 'Valor deve ser maior que zero'),
    totalInstallments: z.number().optional().nullable().default(0),
    date: z.coerce.date().min(1, 'Parâmetro obrigatório.'),
  });
}

export default BalanceSchema;
