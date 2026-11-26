import { describe, expect, it } from 'vitest';
import { BalanceModel } from '../src/models';
import { api, balancePayload, makeToken } from './helpers';

type Item = {
  id: string;
  name: string;
  value: number;
  realized: boolean;
  installment: number;
  totalValue: number;
};

const tokenA = `Bearer ${makeToken('user-a')}`;
const tokenB = `Bearer ${makeToken('user-b')}`;

const notebook3x = {
  name: 'Notebook',
  value: 3000,
  totalInstallments: 3,
  realized: false,
};

async function create(token: string, overrides: Record<string, unknown> = {}) {
  const res = await api
    .post('/balances')
    .set('Authorization', token)
    .send(balancePayload(overrides));
  expect(res.status).toBe(201);
  return res.body as { _id: string };
}

async function itemsOf(token: string, name: string): Promise<Item[]> {
  const res = await api.get('/balances').set('Authorization', token);
  const months = Object.values(res.body) as {
    gains: Item[];
    expenses: Item[];
  }[];
  return months
    .flatMap((m) => [...m.gains, ...m.expenses])
    .filter((i) => i.name === name)
    .sort((a, b) => a.installment - b.installment);
}

describe('PATCH /balances/:id', () => {
  it('mudar o valor de um parcelado mantém o realizado de cada parcela', async () => {
    const { _id } = await create(tokenA, notebook3x);
    await api
      .patch(`/balances/${_id}/installments/2`)
      .set('Authorization', tokenA)
      .send({ realized: true });

    const res = await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({ value: 900 });

    expect(res.status).toBe(200);
    const items = await itemsOf(tokenA, 'Notebook');
    expect(items.map((i) => i.value)).toEqual([300, 300, 300]);
    expect(items.map((i) => i.realized)).toEqual([false, true, false]);
  });

  it('de 3 para 1 parcela vira à vista', async () => {
    const { _id } = await create(tokenA, notebook3x);

    const res = await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({ totalInstallments: 1 });

    expect(res.status).toBe(200);
    expect(res.body.listInstallments).toEqual([]);
    expect(await itemsOf(tokenA, 'Notebook')).toHaveLength(1);
  });

  it('PATCH grava updatedAt', async () => {
    const { _id } = await create(tokenA);

    const res = await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({ name: 'Aluguel novo' });

    expect(res.body.updatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('PATCH sem campos responde 400', async () => {
    const { _id } = await create(tokenA);

    const res = await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe('Nenhum campo para atualizar');
  });

  it('PATCH em lançamento de outro usuário responde 404', async () => {
    const { _id } = await create(tokenA);

    const res = await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenB)
      .send({ name: 'Invadido' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      name: 'NotFoundError',
      message: 'Lançamento não encontrado',
    });
    expect(await itemsOf(tokenA, 'Aluguel')).toHaveLength(1);
  });

  it('PATCH com id malformado responde 400', async () => {
    const res = await api
      .patch('/balances/nao-e-um-id')
      .set('Authorization', tokenA)
      .send({ name: 'X' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('ID malformado ou tipo inválido');
  });

  it('PATCH com nome já usado pelo mesmo usuário responde 409', async () => {
    await create(tokenA);
    const { _id } = await create(tokenA, notebook3x);

    const res = await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({ name: 'Aluguel' });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /balances/:id/installments/:installment', () => {
  it('marcar parcela inexistente ou inválida', async () => {
    const vista = await create(tokenA);
    const parcelado = await create(tokenA, notebook3x);

    const emVista = await api
      .patch(`/balances/${vista._id}/installments/1`)
      .set('Authorization', tokenA)
      .send({ realized: true });
    const foraDoTotal = await api
      .patch(`/balances/${parcelado._id}/installments/9`)
      .set('Authorization', tokenA)
      .send({ realized: true });
    const naoNumero = await api
      .patch(`/balances/${parcelado._id}/installments/x`)
      .set('Authorization', tokenA)
      .send({ realized: true });

    expect(emVista.status).toBe(404);
    expect(emVista.body.message).toBe('Parcela não encontrada');
    expect(foraDoTotal.status).toBe(404);
    expect(naoNumero.status).toBe(400);
    expect(naoNumero.body.errors[0].field).toBe('installment');
  });
});

describe('DELETE /balances', () => {
  it('DELETE remove o lançamento inteiro', async () => {
    const { _id } = await create(tokenA, notebook3x);

    const outro = await api
      .delete(`/balances/${_id}`)
      .set('Authorization', tokenB);
    expect(outro.status).toBe(404);
    expect(await BalanceModel.countDocuments()).toBe(1);

    const res = await api
      .delete(`/balances/${_id}`)
      .set('Authorization', tokenA);

    expect(res.status).toBe(204);
    const get = await api.get('/balances').set('Authorization', tokenA);
    expect(get.body).toEqual({});
  });

  it('DELETE de uma parcela mantém as outras', async () => {
    const { _id } = await create(tokenA, notebook3x);

    const res = await api
      .delete(`/balances/${_id}/installments/2`)
      .set('Authorization', tokenA);

    expect(res.status).toBe(204);
    expect(
      (await itemsOf(tokenA, 'Notebook')).map((i) => i.installment),
    ).toEqual([1, 3]);

    await api
      .delete(`/balances/${_id}/installments/1`)
      .set('Authorization', tokenA);
    await api
      .delete(`/balances/${_id}/installments/3`)
      .set('Authorization', tokenA);
    expect(await BalanceModel.countDocuments()).toBe(0);
  });
});

describe('GET /balances', () => {
  it('GET inclui totalValue', async () => {
    await create(tokenA, notebook3x);
    await create(tokenA);

    const parcelas = await itemsOf(tokenA, 'Notebook');
    const vista = await itemsOf(tokenA, 'Aluguel');

    expect(parcelas.map((i) => i.totalValue)).toEqual([3000, 3000, 3000]);
    expect(vista[0].totalValue).toBe(1500);
  });
});

describe('centavos por parcela', () => {
  it('recusa valor com mais de 2 casas decimais', async () => {
    const res = await api
      .post('/balances')
      .set('Authorization', tokenA)
      .send(balancePayload({ value: 1.005, totalInstallments: 2 }));

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: 'value', message: 'Use no máximo 2 casas decimais.' },
    ]);
  });

  it('recusa parcelas abaixo de um centavo na criação', async () => {
    const res = await api
      .post('/balances')
      .set('Authorization', tokenA)
      .send(balancePayload({ value: 0.05, totalInstallments: 10 }));

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: 'value', message: 'Valor mínimo de R$ 0,01 por parcela.' },
    ]);
  });

  it('recusa parcelas abaixo de um centavo na edição', async () => {
    const { _id } = await create(tokenA, { value: 0.05 });

    const res = await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({ totalInstallments: 10 });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe(
      'Valor mínimo de R$ 0,01 por parcela.',
    );
  });
});

describe('realizado nas transições', () => {
  it('PATCH de realized em parcelado responde 400', async () => {
    const { _id } = await create(tokenA, notebook3x);

    const res = await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({ realized: true });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      {
        field: 'realized',
        message: 'Em parcelados, marque o realizado em cada parcela.',
      },
    ]);
  });

  it('à vista realizado virando parcelado mantém as parcelas realizadas', async () => {
    const { _id } = await create(tokenA, { realized: true });

    await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({ totalInstallments: 3 });

    const items = await itemsOf(tokenA, 'Aluguel');
    expect(items.map((i) => i.realized)).toEqual([true, true, true]);
  });

  it('parcelado voltando a ser à vista herda o realizado da parcela 1', async () => {
    const { _id } = await create(tokenA, notebook3x);
    await api
      .patch(`/balances/${_id}/installments/1`)
      .set('Authorization', tokenA)
      .send({ realized: true });

    await api
      .patch(`/balances/${_id}`)
      .set('Authorization', tokenA)
      .send({ totalInstallments: 1 });

    const items = await itemsOf(tokenA, 'Notebook');
    expect(items.map((i) => i.realized)).toEqual([true]);
  });
});
