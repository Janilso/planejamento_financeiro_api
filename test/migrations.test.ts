import { describe, expect, it } from 'vitest';
import { migrateBalanceIndexes } from '../src/migrations/balances.migration';
import { BalanceModel } from '../src/models';

async function indexNames() {
  return (await BalanceModel.collection.indexes()).map((i) => i.name).sort();
}

// Estado do Atlas antes da correção: só o índice único global em name.
async function legacyAtlasIndexes() {
  await BalanceModel.collection.dropIndexes(); // remove todos, menos o _id_
  await BalanceModel.collection.createIndex(
    { name: 1 },
    { unique: true, name: 'name_1' },
  );
}

describe('migrateBalanceIndexes', () => {
  it('dry-run mostra o que vai mudar e não altera nada', async () => {
    await legacyAtlasIndexes();

    const report = await migrateBalanceIndexes({ apply: false });

    expect(report).toEqual({
      toDrop: ['name_1'],
      toCreate: [{ userId: 1, name: 1 }],
      duplicates: [],
      applied: false,
    });
    expect(await indexNames()).toEqual(['_id_', 'name_1']);
  });

  it('apply troca name_1 por userId_1_name_1', async () => {
    await legacyAtlasIndexes();

    const report = await migrateBalanceIndexes({ apply: true });

    expect(report.applied).toBe(true);
    expect(await indexNames()).toEqual(['_id_', 'userId_1_name_1']);
  });

  it('rodar de novo não muda nada', async () => {
    await legacyAtlasIndexes();
    await migrateBalanceIndexes({ apply: true });

    const report = await migrateBalanceIndexes({ apply: true });

    expect(report).toMatchObject({ toDrop: [], toCreate: [] });
  });

  it('apply recusa quando há nomes repetidos para o mesmo usuário', async () => {
    await BalanceModel.collection.dropIndexes();
    await BalanceModel.collection.insertMany([
      { userId: 'u1', name: 'Mercado' },
      { userId: 'u1', name: 'Mercado' },
    ]);

    await expect(migrateBalanceIndexes({ apply: true })).rejects.toThrow(
      'Há nomes repetidos para o mesmo usuário',
    );
    expect(await indexNames()).toEqual(['_id_']);
    const report = await migrateBalanceIndexes({ apply: false });
    expect(report.duplicates).toEqual([
      { userId: 'u1', name: 'Mercado', count: 2 },
    ]);
  });
});
