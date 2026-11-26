import { describe, expect, it } from 'vitest';
import { api } from './helpers';

describe('cabeçalhos de segurança', () => {
  it('envia cabeçalhos de segurança', async () => {
    const res = await api.get('/nao-existe');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
