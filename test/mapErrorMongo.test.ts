import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { getErrorMongo } from '../src/config';
import { AppError } from '../src/middlewares';

function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('a função não lançou erro');
}

describe('getErrorMongo', () => {
  it('ValidationError do Mongoose vira 400 com os campos', () => {
    const error = new mongoose.Error.ValidationError();
    error.addError(
      'name',
      new mongoose.Error.ValidatorError({
        path: 'name',
        message: 'Path `name` is required.',
        type: 'required',
      }),
    );

    const thrown = thrownBy(() => getErrorMongo(error));

    expect(thrown).toBeInstanceOf(AppError);
    expect(thrown).toMatchObject({
      statusCode: 400,
      name: 'ValidationError',
      message: 'Erro de validação',
      errors: [{ field: 'name', message: 'Campo obrigatório.' }],
    });
  });
});
