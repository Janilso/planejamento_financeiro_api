import { describe, expect, it } from 'vitest';
import { UserModel } from '../src/models';
import { api, makeToken, mockGoogle } from './helpers';

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

    expect(res.status).toBe(200);
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

  it('payload sem e-mail responde 401 e não grava usuário', async () => {
    mockGoogle({ name: 'Sem Email' });

    const res = await api.post('/auth/login').send({ googleToken: 'x' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      name: 'AuthError',
      code: 401,
      message: 'Acesso não autorizado',
      errors: [],
    });
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('payload sem nome responde 401 e não grava usuário', async () => {
    mockGoogle({ email: 'sem-nome@exemplo.com' });

    const res = await api.post('/auth/login').send({ googleToken: 'x' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      name: 'AuthError',
      code: 401,
      message: 'Acesso não autorizado',
      errors: [],
    });
    expect(await UserModel.countDocuments()).toBe(0);
  });
});

describe('POST /auth/refresh', () => {
  it('refreshToken desconhecido responde 401', async () => {
    const res = await api.post('/auth/refresh').send({ refreshToken: 'x' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Refresh token inválido ou expirado');
    expect(res.body.name).toBe('AuthError');
  });

  it('refreshToken válido devolve tokens e grava o novo', async () => {
    const { body: loginBody } = await loginAna();

    const res = await api
      .post('/auth/refresh')
      .send({ refreshToken: loginBody.refreshToken });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['token', 'refreshToken']);
    const user = await UserModel.findOne({ email: 'ana@exemplo.com' }).lean();
    expect(user?.refreshToken).toBe(res.body.refreshToken);
  });
});

describe('contrato de autenticação', () => {
  it('aceita token com prefixo Bearer', async () => {
    const res = await api
      .get('/balances')
      .set('Authorization', `Bearer ${makeToken('user-a')}`);

    expect(res.status).toBe(200);
  });

  it('continua aceitando o token cru', async () => {
    const res = await api
      .get('/balances')
      .set('Authorization', makeToken('user-a'));

    expect(res.status).toBe(200);
  });

  it('login com email_verified false responde 401', async () => {
    mockGoogle({ ...ana, email_verified: false });

    const res = await api.post('/auth/login').send({ googleToken: 'x' });

    expect(res.status).toBe(401);
    expect(await UserModel.countDocuments()).toBe(0);
  });
});

describe('POST /auth/logout', () => {
  it('logout revoga o refresh token', async () => {
    const { body } = await loginAna();

    const logout = await api
      .post('/auth/logout')
      .set('Authorization', `Bearer ${body.token}`);
    const refresh = await api
      .post('/auth/refresh')
      .send({ refreshToken: body.refreshToken });

    expect(logout.status).toBe(204);
    expect(refresh.status).toBe(401);
  });

  it('logout sem token responde 401', async () => {
    const res = await api.post('/auth/logout');

    expect(res.status).toBe(401);
  });
});
