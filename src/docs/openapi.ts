import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthSchema, BalanceSchema } from '../schemas';
import { ERROR_MESSAGES } from '../utils';
import { zodToSchema } from './zodToSchema';

type Operation = Record<string, unknown> & {
  responses: Record<string, unknown>;
};

export type OpenApiSpec = {
  openapi: string;
  info: Record<string, unknown>;
  tags: { name: string; description: string }[];
  paths: Record<string, Record<string, Operation>>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
    responses: Record<string, unknown>;
  };
};

// Funciona em src/docs (tsx) e em dist/docs (build): o package.json fica
// dois níveis acima.
const { version } = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
) as { version: string };

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: unknown, example?: unknown) => ({
  content: {
    'application/json': { schema, ...(example ? { example } : {}) },
  },
});
const errorExample = (
  code: number,
  name: string,
  message: string,
  errors: { field: string; message: string }[] = [],
) => ({ name, code, message, errors });
const error = (description: string, example: unknown) => ({
  description,
  ...json(ref('Error'), example),
});
const respRef = (name: string) => ({ $ref: `#/components/responses/${name}` });
const auth = [{ bearerAuth: [] }];

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Id do lançamento (o `id` dos itens do GET /balances).',
  schema: { type: 'string', example: '6745f0c2a1b2c3d4e5f60718' },
};
const installmentParam = {
  name: 'installment',
  in: 'path',
  required: true,
  description: 'Número da parcela, a partir de 1.',
  schema: { type: 'integer', minimum: 1, example: 2 },
};

const updateBalance = {
  ...zodToSchema(BalanceSchema.update),
  // O refine do zod (pelo menos um campo) não vira JSON Schema.
  minProperties: 1,
};

export const openApiSpec: OpenApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Planejamento Financeiro API',
    version,
    description: [
      'API do app Planejamento Financeiro: login com a conta Google e lançamentos de ganhos e gastos, à vista ou parcelados, agrupados por mês.',
      '',
      '**Para testar as rotas protegidas:** gere um token com `npm run token:dev -- <userId>` e cole em **Authorize**.',
      '',
      'Valores em reais com 2 casas. Meses e parcelas no fuso `America/Sao_Paulo`. Todo erro segue o schema `Error`.',
    ].join('\n'),
  },
  tags: [
    {
      name: 'Autenticação',
      description: 'Login com Google, renovação e logout',
    },
    {
      name: 'Lançamentos',
      description: 'Ganhos e gastos, à vista ou parcelados',
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Entra com o idToken do Google',
        description:
          'Verifica o `idToken` do Google (audiência = `GOOGLE_CLIENT_ID`), cria ou atualiza o usuário pelo e-mail e devolve o token de acesso (1 h) e o refresh token (15 dias). Recusa e-mail não verificado.',
        requestBody: {
          required: true,
          ...json(ref('LoginBody'), { googleToken: '<idToken do Google>' }),
        },
        responses: {
          200: { description: 'Tokens gerados', ...json(ref('Tokens')) },
          400: respRef('BadRequest'),
          401: error(
            'idToken recusado, sem e-mail/nome ou e-mail não verificado',
            errorExample(401, 'AuthError', ERROR_MESSAGES.INVALID_ACCESS),
          ),
          429: respRef('TooManyRequests'),
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Autenticação'],
        summary: 'Troca o refresh token por tokens novos',
        description:
          'O refresh token é de uso único: a resposta traz um par novo e o antigo deixa de valer. Um refresh inválido também revoga a sessão.',
        requestBody: {
          required: true,
          ...json(ref('RefreshBody'), { refreshToken: '<refresh token>' }),
        },
        responses: {
          200: { description: 'Tokens novos', ...json(ref('Tokens')) },
          400: respRef('BadRequest'),
          401: error(
            'Refresh token inválido, expirado ou revogado',
            errorExample(
              401,
              'AuthError',
              ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
            ),
          ),
          429: respRef('TooManyRequests'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Autenticação'],
        summary: 'Sai e revoga o refresh token',
        security: auth,
        responses: {
          204: { description: 'Sessão encerrada' },
          401: respRef('Unauthorized'),
          403: respRef('Forbidden'),
          429: respRef('TooManyRequests'),
        },
      },
    },
    '/balances': {
      get: {
        tags: ['Lançamentos'],
        summary: 'Lista os lançamentos agrupados por mês',
        description:
          'Cada parcela vira um item no mês em que vence. A chave do mês é `MMM/yy` em pt-BR e maiúsculas (ex.: `NOV/26`), no fuso de São Paulo. Sem lançamentos, devolve `{}`.',
        security: auth,
        responses: {
          200: {
            description: 'Mapa mês → ganhos e gastos',
            ...json(ref('MonthBalances'), {
              'NOV/26': {
                gains: [],
                expenses: [
                  {
                    id: '6745f0c2a1b2c3d4e5f60718',
                    name: 'TV',
                    value: 33.33,
                    totalValue: 100,
                    type: 'expenses',
                    installment: 1,
                    totalInstallments: 3,
                    realized: false,
                    date: '2026-11-15T12:00:00.000Z',
                  },
                ],
              },
            }),
          },
          401: respRef('Unauthorized'),
          403: respRef('Forbidden'),
          429: respRef('TooManyRequests'),
        },
      },
      post: {
        tags: ['Lançamentos'],
        summary: 'Cria um lançamento',
        description:
          'Com `totalInstallments` de 2 a 30, gera as parcelas (uma por mês). O valor é dividido em centavos e o resto vai para a última parcela: 100 em 3x = 33,33 + 33,33 + 33,34. O nome é único por usuário.',
        security: auth,
        requestBody: {
          required: true,
          ...json(ref('CreateBalance'), {
            name: 'TV',
            value: 100,
            type: 'expenses',
            installment: 1,
            totalInstallments: 3,
            date: '2026-11-15T12:00:00.000Z',
            realized: false,
          }),
        },
        responses: {
          201: { description: 'Lançamento criado', ...json(ref('Balance')) },
          400: respRef('BadRequest'),
          401: respRef('Unauthorized'),
          403: respRef('Forbidden'),
          409: respRef('Conflict'),
          429: respRef('TooManyRequests'),
        },
      },
    },
    '/balances/{id}': {
      patch: {
        tags: ['Lançamentos'],
        summary: 'Edita o lançamento inteiro',
        description:
          'Só os campos enviados mudam. Se o valor, o número de parcelas ou a data mudarem, **as parcelas são refeitas**, e cada uma mantém o `realized` que tinha (pelo número da parcela). Com 1 parcela ou menos, vira à vista. Em parcelado, `realized` é recusado: marque pela rota da parcela.',
        security: auth,
        parameters: [idParam],
        requestBody: {
          required: true,
          ...json(ref('UpdateBalance'), { name: 'Televisão', value: 120 }),
        },
        responses: {
          200: {
            description: 'Lançamento atualizado',
            ...json(ref('Balance')),
          },
          400: respRef('BadRequest'),
          401: respRef('Unauthorized'),
          403: respRef('Forbidden'),
          404: respRef('BalanceNotFound'),
          409: respRef('Conflict'),
          429: respRef('TooManyRequests'),
        },
      },
      delete: {
        tags: ['Lançamentos'],
        summary: 'Exclui o lançamento com todas as parcelas',
        security: auth,
        parameters: [idParam],
        responses: {
          204: { description: 'Excluído' },
          400: respRef('BadRequest'),
          401: respRef('Unauthorized'),
          403: respRef('Forbidden'),
          404: respRef('BalanceNotFound'),
          429: respRef('TooManyRequests'),
        },
      },
    },
    '/balances/{id}/installments/{installment}': {
      patch: {
        tags: ['Lançamentos'],
        summary: 'Marca uma parcela como realizada (ou não)',
        security: auth,
        parameters: [idParam, installmentParam],
        requestBody: {
          required: true,
          ...json(ref('InstallmentRealized'), { realized: true }),
        },
        responses: {
          200: {
            description: 'Lançamento atualizado',
            ...json(ref('Balance')),
          },
          400: respRef('BadRequest'),
          401: respRef('Unauthorized'),
          403: respRef('Forbidden'),
          404: respRef('BalanceNotFound'),
          429: respRef('TooManyRequests'),
        },
      },
      delete: {
        tags: ['Lançamentos'],
        summary: 'Exclui só uma parcela',
        description:
          'As outras parcelas continuam. Se não sobrar nenhuma, o lançamento também é apagado. Uma edição que refaça as parcelas traz a parcela excluída de volta.',
        security: auth,
        parameters: [idParam, installmentParam],
        responses: {
          204: { description: 'Excluída' },
          400: respRef('BadRequest'),
          401: respRef('Unauthorized'),
          403: respRef('Forbidden'),
          404: respRef('BalanceNotFound'),
          429: respRef('TooManyRequests'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token de acesso do POST /auth/login (ou do `npm run token:dev`). O token cru, sem `Bearer`, também é aceito.',
      },
    },
    schemas: {
      ErrorItem: {
        type: 'object',
        required: ['field', 'message'],
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        required: ['name', 'code', 'message', 'errors'],
        properties: {
          name: {
            type: 'string',
            enum: [
              'AuthError',
              'ValidationError',
              'InternalServerError',
              'DatabaseError',
              'NotFoundError',
              'RateLimitError',
            ],
          },
          code: { type: 'integer' },
          message: { type: 'string' },
          errors: { type: 'array', items: ref('ErrorItem') },
        },
      },
      Tokens: {
        type: 'object',
        required: ['token', 'refreshToken'],
        properties: {
          token: { type: 'string', description: 'JWT de acesso, vale 1 hora' },
          refreshToken: {
            type: 'string',
            description: 'JWT de refresh, vale 15 dias e é de uso único',
          },
        },
      },
      Installment: {
        type: 'object',
        required: [
          'name',
          'value',
          'realized',
          'installment',
          'totalInstallments',
          'type',
          'date',
        ],
        properties: {
          name: { type: 'string' },
          value: { type: 'number', description: 'Valor desta parcela' },
          realized: { type: 'boolean' },
          installment: { type: 'integer', minimum: 1 },
          totalInstallments: { type: 'integer' },
          type: { type: 'string', enum: ['gains', 'expenses'] },
          date: {
            type: 'string',
            format: 'date-time',
            description: 'Vencimento da parcela (UTC)',
          },
          userId: { type: 'string' },
        },
      },
      Balance: {
        type: 'object',
        description:
          'Lançamento como fica gravado. Em parcelado, `value` é o total e as parcelas ficam em `listInstallments`; à vista, a lista é vazia.',
        required: [
          '_id',
          'userId',
          'name',
          'value',
          'type',
          'installment',
          'totalInstallments',
          'date',
          'listInstallments',
        ],
        properties: {
          _id: { type: 'string' },
          userId: { type: 'string' },
          name: { type: 'string' },
          value: { type: 'number', description: 'Valor total' },
          realized: { type: 'boolean' },
          type: { type: 'string', enum: ['gains', 'expenses'] },
          installment: { type: 'integer' },
          totalInstallments: {
            type: 'integer',
            description: '0 ou 1 = à vista',
          },
          date: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          listInstallments: { type: 'array', items: ref('Installment') },
        },
      },
      BalanceItem: {
        type: 'object',
        description: 'Um item do mês: o lançamento à vista ou uma parcela.',
        required: [
          'id',
          'name',
          'value',
          'totalValue',
          'type',
          'installment',
          'totalInstallments',
          'realized',
          'date',
        ],
        properties: {
          id: {
            type: 'string',
            description: 'Id do lançamento (o mesmo em todas as parcelas)',
          },
          name: { type: 'string' },
          value: {
            type: 'number',
            description: 'Valor desta parcela (ou do lançamento à vista)',
          },
          totalValue: {
            type: 'number',
            description: 'Valor do lançamento inteiro',
          },
          type: { type: 'string', enum: ['gains', 'expenses'] },
          installment: { type: 'integer' },
          totalInstallments: { type: 'integer' },
          realized: { type: 'boolean' },
          date: { type: 'string', format: 'date-time' },
        },
      },
      MonthBalances: {
        type: 'object',
        description: 'Chave = mês `MMM/yy` (ex.: `NOV/26`).',
        additionalProperties: {
          type: 'object',
          required: ['gains', 'expenses'],
          properties: {
            gains: { type: 'array', items: ref('BalanceItem') },
            expenses: { type: 'array', items: ref('BalanceItem') },
          },
        },
      },
      LoginBody: zodToSchema(AuthSchema.login),
      RefreshBody: zodToSchema(AuthSchema.refresh),
      CreateBalance: zodToSchema(BalanceSchema.create),
      UpdateBalance: updateBalance,
      InstallmentRealized: zodToSchema(BalanceSchema.installmentRealized),
    },
    responses: {
      BadRequest: error(
        'Corpo, parâmetro ou JSON inválido',
        errorExample(400, 'ValidationError', ERROR_MESSAGES.VALIDATION, [
          { field: 'value', message: 'Valor deve ser maior que zero' },
        ]),
      ),
      Unauthorized: error(
        'Sem o header Authorization',
        errorExample(401, 'AuthError', ERROR_MESSAGES.INVALID_ACCESS),
      ),
      Forbidden: error(
        'Token inválido ou expirado',
        errorExample(403, 'AuthError', ERROR_MESSAGES.INVALID_TOKEN),
      ),
      BalanceNotFound: error(
        'Lançamento ou parcela não existe, ou é de outro usuário',
        errorExample(404, 'NotFoundError', ERROR_MESSAGES.BALANCE_NOT_FOUND),
      ),
      Conflict: error(
        'Nome já usado pelo mesmo usuário',
        errorExample(409, 'DatabaseError', ERROR_MESSAGES.DUPLICATE_KEY),
      ),
      TooManyRequests: error(
        'Limite de requisições por IP atingido',
        errorExample(429, 'RateLimitError', ERROR_MESSAGES.TOO_MANY_REQUESTS),
      ),
    },
  },
};
