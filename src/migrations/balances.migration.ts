import type { IndexesDiff } from 'mongoose';
import { BalanceModel } from '../models';

export type BalanceIndexMigrationReport = {
  toDrop: IndexesDiff['toDrop'];
  toCreate: IndexesDiff['toCreate'];
  duplicates: { userId: string | null; name: string | null; count: number }[];
  applied: boolean;
};

type DuplicateGroup = {
  _id: { userId: string | null; name: string | null };
  count: number;
};

async function findDuplicateNames() {
  const groups = await BalanceModel.aggregate<DuplicateGroup>([
    {
      $group: {
        // $ifNull junta campo ausente e null num grupo só: para o índice
        // único, os dois contam como o mesmo valor.
        _id: {
          userId: { $ifNull: ['$userId', null] },
          name: { $ifNull: ['$name', null] },
        },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  return groups.map(({ _id, count }) => ({
    userId: _id.userId,
    name: _id.name,
    count,
  }));
}

// Alinha os índices de balances ao schema. O Mongoose cria índices novos
// sozinho (autoIndex), mas nunca remove os que saíram do schema, como o
// name_1 único entre todos os usuários.
export async function migrateBalanceIndexes(options: {
  apply: boolean;
}): Promise<BalanceIndexMigrationReport> {
  const { toDrop, toCreate } = await BalanceModel.diffIndexes();
  const duplicates = await findDuplicateNames();

  if (!options.apply) {
    return { toDrop, toCreate, duplicates, applied: false };
  }

  if (duplicates.length > 0) {
    const pairs = duplicates
      .map((d) => `${d.userId}/${d.name} (${d.count}x)`)
      .join(', ');
    throw new Error(
      `Há nomes repetidos para o mesmo usuário; resolva antes de aplicar: ${pairs}`,
    );
  }

  // Cria o índice novo antes de remover o antigo: se a criação falhar,
  // o name_1 continua protegendo os dados.
  await BalanceModel.createIndexes();
  await BalanceModel.cleanIndexes();
  return { toDrop, toCreate, duplicates, applied: true };
}
