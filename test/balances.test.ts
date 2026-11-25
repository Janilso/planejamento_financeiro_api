import { describe, expect, it } from 'vitest';
import { api, balancePayload, makeToken } from './helpers';

type Installment = {
  installment: number;
  value: number;
  date: string;
  realized: boolean;
};

const tokenA = makeToken('user-a');
const tokenB = makeToken('user-b');

const notebook3x = {
  name: 'Notebook',
  value: 3000,
  totalInstallments: 3,
  realized: false,
};

function createBalance(token: string, overrides: Record<string, unknown> = {}) {
  return api
    .post('/balances')
    .set('Authorization', token)
    .send(balancePayload(overrides));
}

describe('/balances', () => {
  it('GET sem Authorization responde 401', async () => {
    const res = await api.get('/balances');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      name: 'ValidationError',
      code: 401,
      message: 'Acesso não autorizado',
      errors: [],
    });
  });

  it('GET com token inválido responde 403', async () => {
    const res = await api.get('/balances').set('Authorization', 'x');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      name: 'AuthError',
      code: 403,
      message: 'Token inválido ou expirado',
      errors: [],
    });
  });

  it('POST à vista grava sem parcelas', async () => {
    const res = await createBalance(tokenA);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId: 'user-a',
      name: 'Aluguel',
      value: 1500,
      totalInstallments: 0,
      listInstallments: [],
    });
  });

  it('POST com totalInstallments 1 é tratado como à vista', async () => {
    const res = await createBalance(tokenA, { totalInstallments: 1 });

    expect(res.status).toBe(201);
    expect(res.body.listInstallments).toEqual([]);
    expect(res.body.totalInstallments).toBe(1);
  });

  it('POST parcelado em 3x gera as parcelas mensais', async () => {
    const res = await createBalance(tokenA, notebook3x);

    expect(res.status).toBe(201);
    expect(
      res.body.listInstallments.map((i: Installment) => [
        i.installment,
        i.value,
        i.date,
      ]),
    ).toEqual([
      [1, 1000, '2026-01-15T12:00:00.000Z'],
      [2, 1000, '2026-02-15T12:00:00.000Z'],
      [3, 1000, '2026-03-15T12:00:00.000Z'],
    ]);
  });

  it('GET agrupa por mês e separa gains de expenses', async () => {
    await createBalance(tokenA, {
      name: 'Salário',
      value: 5000,
      type: 'gains',
    });
    await createBalance(tokenA, notebook3x);

    const res = await api.get('/balances').set('Authorization', tokenA);

    expect(res.status).toBe(201); // comportamento atual; a Task 7 corrige para 200
    expect(Object.keys(res.body).sort()).toEqual([
      'FEV/26',
      'JAN/26',
      'MAR/26',
    ]);
    expect(
      res.body['JAN/26'].gains.map((b: { name: string }) => b.name),
    ).toEqual(['Salário']);
    expect(res.body['JAN/26'].expenses).toMatchObject([
      { name: 'Notebook', installment: 1, value: 1000 },
    ]);
    expect(res.body['FEV/26'].gains).toEqual([]);
    expect(res.body['FEV/26'].expenses[0].installment).toBe(2);
  });

  it('GET de usuário sem lançamentos devolve {}', async () => {
    await createBalance(tokenB);

    const res = await api.get('/balances').set('Authorization', tokenA);

    expect(res.body).toEqual({});
  });
});

describe('nome do lançamento', () => {
  it('usuários diferentes podem usar o mesmo nome', async () => {
    const resA = await createBalance(tokenA);
    const resB = await createBalance(tokenB);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
  });

  it('o mesmo usuário não pode repetir um nome', async () => {
    await createBalance(tokenA);

    const res = await createBalance(tokenA);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      name: 'DatabaseError',
      code: 409,
      message: 'Chave duplicada',
      errors: [],
    });
  });

  it('nome com espaços nas pontas conta como o mesmo nome', async () => {
    await createBalance(tokenA);

    const res = await createBalance(tokenA, { name: '  Aluguel ' });

    expect(res.status).toBe(409);
  });

  it('nome só com espaços responde 400', async () => {
    const res = await createBalance(tokenA, { name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: 'name', message: 'Parâmetro obrigatório.' },
    ]);
  });
});

describe('contrato do POST /balances', () => {
  it('parcelado sem realized grava as parcelas como não realizadas', async () => {
    const res = await createBalance(tokenA, {
      name: 'TV',
      value: 300,
      totalInstallments: 3,
      realized: undefined,
    });

    expect(res.status).toBe(201);
    expect(res.body.realized).toBe(false);
    expect(
      res.body.listInstallments.map((i: Installment) => i.realized),
    ).toEqual([false, false, false]);
  });
});
