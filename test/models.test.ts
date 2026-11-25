import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BalanceModel, UserModel } from '../src/models';

describe('campos obrigatórios', () => {
  it('lançamento sem campos obrigatórios não passa na validação', async () => {
    const error = await new BalanceModel({}).validate().catch((e) => e);

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(Object.keys(error.errors).sort()).toEqual([
      'date',
      'installment',
      'name',
      'type',
      'userId',
      'value',
    ]);
  });

  it('usuário sem nome e e-mail não passa na validação', async () => {
    const error = await new UserModel({}).validate().catch((e) => e);

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(Object.keys(error.errors).sort()).toEqual(['email', 'name']);
  });
});

describe('createdAt', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cada lançamento recebe a hora da própria criação', () => {
    vi.useFakeTimers({ toFake: ['Date'] }); // só o Date; os timers do driver do MongoDB continuam reais
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const primeiro = new BalanceModel({ name: 'a' });
    vi.setSystemTime(new Date('2030-02-01T00:00:00.000Z'));
    const segundo = new BalanceModel({ name: 'b' });

    expect(primeiro.createdAt).toBe('2030-01-01T00:00:00.000Z');
    expect(segundo.createdAt).toBe('2030-02-01T00:00:00.000Z');
  });
});
