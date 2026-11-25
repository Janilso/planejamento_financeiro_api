import { describe, expect, it } from 'vitest';
import { UserModel } from '../src/models';
import { api, mockGoogle } from './helpers';

const ana = {
  email: 'ana@exemplo.com',
  name: 'Ana',
  picture: 'https://exemplo.com/ana.png',
};

function loginAna() {
  mockGoogle(ana);
  return api.post('/auth/login').send({ googleToken: 'token-do-google' });
}

describe('POST /auth/login', () => {
  it('sem googleToken responde 400', async () => {
    const res = await api.post('/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      name: 'ValidationError',
      code: 400,
      message: 'Erro de validação',
    });
    expect(res.body.errors[0].field).toBe('googleToken');
  });

  it('token recusado pelo Google responde 401', async () => {
    mockGoogle(new Error('invalid'));

    const res = await api.post('/auth/login').send({ googleToken: 'x' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      name: 'AuthError',
      code: 401,
      message: 'Acesso não autorizado',
      errors: [],
    });
  });

  it('token válido cria o usuário e devolve os tokens', async () => {
    const res = await loginAna();

    expect(res.status).toBe(201);
    expect(Object.keys(res.body)).toEqual(['token', 'refreshToken']);
    const user = await UserModel.findOne({ email: 'ana@exemplo.com' }).lean();
    expect(user).toMatchObject({
      name: 'Ana',
      picture: 'https://exemplo.com/ana.png',
      refreshToken: res.body.refreshToken,
    });
  });

  it('login repetido com o mesmo e-mail não duplica o usuário', async () => {
    await loginAna();
    await loginAna();

    expect(await UserModel.countDocuments()).toBe(1);
  });
});

describe('POST /auth/refresh', () => {
  it('refreshToken desconhecido responde 401', async () => {
    const res = await api.post('/auth/refresh').send({ refreshToken: 'x' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Refresh token inválido ou expirado');
  });

  it('refreshToken válido devolve tokens e grava o novo', async () => {
    const { body: loginBody } = await loginAna();

    const res = await api
      .post('/auth/refresh')
      .send({ refreshToken: loginBody.refreshToken });

    expect(res.status).toBe(201);
    expect(Object.keys(res.body)).toEqual(['token', 'refreshToken']);
    const user = await UserModel.findOne({ email: 'ana@exemplo.com' }).lean();
    expect(user?.refreshToken).toBe(res.body.refreshToken);
  });
});
