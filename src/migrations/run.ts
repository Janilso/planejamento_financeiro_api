import mongoose from 'mongoose';
import { environment } from '../config';
import { migrateBalanceIndexes } from './balances.migration';

// Uso: npm run db:migrate (dry-run) | npm run db:migrate -- --apply
async function main() {
  const apply = process.argv.includes('--apply');

  try {
    // Sem autoIndex e autoCreate, o Mongoose não cria o índice novo ao
    // conectar, e o dry-run continua sem efeito colateral.
    await mongoose.connect(environment.mongoUri, {
      autoIndex: false,
      autoCreate: false,
    });
    // Nunca imprimir a URI: ela contém a senha.
    console.log(
      `Banco: ${mongoose.connection.host}/${mongoose.connection.name}`,
    );

    const report = await migrateBalanceIndexes({ apply });
    console.log(JSON.stringify(report));
    if (!report.applied) {
      console.log(
        'Dry-run: nada foi alterado. Para aplicar: npm run db:migrate -- --apply',
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void main();
