import { describe, expect, it, vi } from 'vitest';

// O vi.hoisted roda antes dos imports: o app já sobe com o limite baixo.
// Cada arquivo de teste tem os próprios módulos, então os outros não são afetados.
vi.hoisted(() => {
  process.env.RATE_LIMIT_AUTH_MAX = '3';
});

import { api } from './helpers';

describe('limite de requisições', () => {
  it('limita tentativas de login', async () => {
    for (let i = 0; i < 3; i++) {
      await api.post('/auth/login').send({});
    }
    const res = await api.post('/auth/login').send({});

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      name: 'RateLimitError',
      code: 429,
      message: 'Muitas requisições. Tente de novo em alguns minutos.',
      errors: [],
    });
  });
});
