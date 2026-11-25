import type { IndexesDiff } from 'mongoose';
import { BalanceModel } from '../models';

export type BalanceIndexMigrationReport = {
  toDrop: IndexesDiff['toDrop'];
  toCreate: IndexesDiff['toCreate'];
  duplicates: { userId: string; name: string; count: number }[];
  applied: boolean;
};

type DuplicateGroup = {
  _id: { userId: string; name: string };
  count: number;
};

async function findDuplicateNames() {
  const groups = await BalanceModel.aggregate<DuplicateGroup>([
    {
      $group: {
        _id: { userId: '$userId', name: '$name' },
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

  await BalanceModel.syncIndexes();
  return { toDrop, toCreate, duplicates, applied: true };
}
