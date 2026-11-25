import { describe, expect, it } from 'vitest';
import { api } from './helpers';

describe('erros HTTP', () => {
  it('JSON malformado responde 400', async () => {
    const res = await api
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"googleToken":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      name: 'ValidationError',
      code: 400,
      message: 'JSON inválido',
      errors: [],
    });
  });

  it('rota inexistente responde 404 em JSON', async () => {
    const res = await api.get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      name: 'NotFoundError',
      code: 404,
      message: 'Rota não encontrada',
      errors: [],
    });
  });
});
