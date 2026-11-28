import type { BalanceType } from '../../src/models';

// Mesmas regras de volume do app (test/volumes.dart), sem precisar do mesmo
// JSON: o que importa é o tamanho do histórico.
export type Volume = 'leve' | 'pesado' | 'extremo';

export const VOLUMES: Volume[] = ['leve', 'pesado', 'extremo'];

// Itens no GET /balances: cada parcela conta como um item.
export const ITENS_ESPERADOS: Record<Volume, number> = {
  leve: 504,
  pesado: 3724,
  extremo: 8400,
};

const REGRAS: Record<Volume, { meses: number; porMes: number }> = {
  leve: { meses: 12, porMes: 15 },
  pesado: { meses: 60, porMes: 20 },
  extremo: { meses: 120, porMes: 25 },
};

const NOMES = [
  'Mercado', 'Aluguel', 'Salário', 'Internet', 'Farmácia', 'Combustível',
  'Academia', 'Streaming', 'Seguro', 'Escola', 'Restaurante', 'Presente',
  'Manutenção', 'Freelance', 'Condomínio', 'Energia', 'Água', 'Telefone',
  'Transporte', 'Lazer', 'Roupas', 'Dentista', 'Reembolso', 'Bônus', 'Venda',
  'Cartão', 'Viagem', 'Impostos', 'Livros', 'Pet',
]; // prettier-ignore

// Gerador pseudoaleatório determinístico (mulberry32).
function sorteio(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Do mês mais antigo até o de `hoje`. Um em cada cinco lançamentos é parcelado
// em 10x (as parcelas caem nos meses seguintes). O `pesado` tem 150
// lançamentos no mês atual. Datas às 15:00Z, até o dia 28.
export function gerarLancamentos(volume: Volume, hoje: Date): BalanceType[] {
  const { meses, porMes } = REGRAS[volume];
  const rnd = sorteio(42);
  const lancamentos: BalanceType[] = [];

  for (let m = meses - 1; m >= 0; m--) {
    const quantos = m === 0 && volume === 'pesado' ? 150 : porMes;
    for (let i = 0; i < quantos; i++) {
      const dia = 1 + (i % 28);
      const centavos = 500 + Math.floor(rnd() * 299501);
      lancamentos.push({
        name: `${NOMES[(i + m) % NOMES.length]} ${m}-${i}`,
        value: centavos / 100,
        type: i % 4 === 0 ? 'gains' : 'expenses',
        installment: 1,
        totalInstallments: i % 5 === 0 ? 10 : 1,
        realized: m > 0 || i % 2 === 0,
        date: new Date(
          Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - m, dia, 15),
        ).toISOString(),
      });
    }
  }
  return lancamentos;
}
