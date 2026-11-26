import SwaggerParser from '@apidevtools/swagger-parser';
import { describe, expect, it } from 'vitest';
import { docsUrl } from '../src/docs/docsUrl';
import { openApiSpec } from '../src/docs/openapi';
import { authRoutes, balanceRoutes } from '../src/routes';
import { generateDevToken } from '../src/scripts/devToken';
import {
  api,
  balancePayload,
  expectMatchesSpec,
  makeToken,
  mockGoogle,
} from './helpers';

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean> };
};

function expressRoutes() {
  return [authRoutes, balanceRoutes]
    .flatMap((router) => router.stack as RouteLayer[])
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route!.methods).map(
        (method) =>
          `${method.toUpperCase()} ${layer.route!.path.replace(/:(\w+)/g, '{$1}')}`,
      ),
    )
    .sort();
}

function documentedRoutes() {
  return Object.entries(openApiSpec.paths)
    .flatMap(([path, operations]) =>
      Object.keys(operations).map(
        (method) => `${method.toUpperCase()} ${path}`,
      ),
    )
    .sort();
}

const token = `Bearer ${makeToken('user-a')}`;
const ana = { email: 'ana@exemplo.com', name: 'Ana', picture: 'x' };

describe('documentação da API (OpenAPI)', () => {
  it('o spec é um OpenAPI válido', async () => {
    await expect(
      SwaggerParser.validate(structuredClone(openApiSpec) as never),
    ).resolves.toBeTruthy();
  });

  it('toda rota do Express está no spec, e vice-versa', () => {
    expect(documentedRoutes()).toEqual(expressRoutes());
  });

  it('serve o spec e a tela', async () => {
    const json = await api.get('/docs/openapi.json');
    expect(json.status).toBe(200);
    expect(json.body).toEqual(JSON.parse(JSON.stringify(openApiSpec)));

    const html = await api.get('/docs/');
    expect(html.status).toBe(200);
    expect(html.headers['content-type']).toContain('text/html');
  });

  it('o link do Swagger usa a porta', () => {
    expect(docsUrl(3000)).toBe('http://localhost:3000/docs');
  });

  it('o corpo gerado do zod acompanha a validação', () => {
    type Field = { anyOf?: Field[]; maximum?: number; enum?: string[] };
    const create = openApiSpec.components.schemas.CreateBalance as {
      properties: Record<string, Field>;
    };
    // totalInstallments aceita null, então o zod gera um anyOf.
    const parcelas = create.properties.totalInstallments.anyOf ?? [];
    expect(parcelas.map((f) => f.maximum)).toContain(30);
    expect(create.properties.type.enum).toEqual(['gains', 'expenses']);
  });

  it('respostas reais seguem o spec', async () => {
    mockGoogle(ana);
    const login = await api.post('/auth/login').send({ googleToken: 'x' });
    expectMatchesSpec(login, 'post', '/auth/login');
    const refresh = await api
      .post('/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });
    expectMatchesSpec(refresh, 'post', '/auth/refresh');

    const avista = await api
      .post('/balances')
      .set('Authorization', token)
      .send(balancePayload());
    expectMatchesSpec(avista, 'post', '/balances');
    const parcelado = await api
      .post('/balances')
      .set('Authorization', token)
      .send(balancePayload({ name: 'TV', value: 100, totalInstallments: 3 }));
    expectMatchesSpec(parcelado, 'post', '/balances');

    const list = await api.get('/balances').set('Authorization', token);
    expectMatchesSpec(list, 'get', '/balances');

    const patch = await api
      .patch(`/balances/${avista.body._id}`)
      .set('Authorization', token)
      .send({ name: 'Aluguel novo' });
    expectMatchesSpec(patch, 'patch', '/balances/{id}');
    const parcela = await api
      .patch(`/balances/${parcelado.body._id}/installments/2`)
      .set('Authorization', token)
      .send({ realized: true });
    expectMatchesSpec(
      parcela,
      'patch',
      '/balances/{id}/installments/{installment}',
    );

    const invalido = await api
      .post('/balances')
      .set('Authorization', token)
      .send({});
    expect(invalido.status).toBe(400);
    expectMatchesSpec(invalido, 'post', '/balances');
    const semToken = await api.get('/balances');
    expect(semToken.status).toBe(401);
    expectMatchesSpec(semToken, 'get', '/balances');
    const inexistente = await api
      .delete('/balances/507f1f77bcf86cd799439011')
      .set('Authorization', token);
    expect(inexistente.status).toBe(404);
    expectMatchesSpec(inexistente, 'delete', '/balances/{id}');
    const repetido = await api
      .post('/balances')
      .set('Authorization', token)
      .send(balancePayload({ name: 'TV' }));
    expect(repetido.status).toBe(409);
    expectMatchesSpec(repetido, 'post', '/balances');
  });

  it('token de desenvolvimento abre as rotas', async () => {
    const res = await api
      .get('/balances')
      .set('Authorization', `Bearer ${generateDevToken('user-dev')}`);
    expect(res.status).toBe(200);
    expect(() => generateDevToken('user-dev', 'production')).toThrow();
  });
});
