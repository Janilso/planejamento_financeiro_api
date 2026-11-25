import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
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
