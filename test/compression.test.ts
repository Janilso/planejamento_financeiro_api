import { describe, expect, it } from 'vitest';
import { api, balancePayload, makeToken } from './helpers';

const token = makeToken('user-gzip');

// Passa de 1 KB, o mínimo para o compression comprimir.
async function criarLancamentos() {
  for (let i = 0; i < 10; i++) {
    await api
      .post('/balances')
      .set('Authorization', token)
      .send(balancePayload({ name: `Lançamento número ${i}` }));
  }
}

describe('compressão das respostas', () => {
  it('GET /balances com Accept-Encoding gzip responde comprimido', async () => {
    await criarLancamentos();

    const res = await api
      .get('/balances')
      .set('Authorization', token)
      .set('Accept-Encoding', 'gzip');

    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.body['JAN/26'].expenses).toHaveLength(10);
  });

  it('com Accept-Encoding identity responde sem compressão', async () => {
    await criarLancamentos();

    const res = await api
      .get('/balances')
      .set('Authorization', token)
      .set('Accept-Encoding', 'identity');

    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
  });
});
