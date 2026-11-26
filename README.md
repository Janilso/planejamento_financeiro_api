# Planejamento Financeiro: API

API do app [Planejamento Financeiro](https://github.com/Janilso/planejamento_financeiro). Ela faz o login com a conta Google e guarda os lançamentos de ganhos e gastos, à vista ou parcelados (até 30x), agrupados mês a mês.

Stack: Node, TypeScript, Express 5, Mongoose (MongoDB) e zod. Os testes usam Vitest, supertest e um MongoDB em memória.

## Requisitos

- Node 22 ou mais novo. O CI usa o 24.
- Um MongoDB: local para desenvolvimento, Atlas em produção.

## Configuração

```sh
npm install
cp .env.example .env   # e preencha os valores
```

| Variável | Obrigatória | Para quê |
|---|---|---|
| `MONGO_URI` | sim | Conexão com o MongoDB |
| `GOOGLE_CLIENT_ID` | sim | Audiência (`aud`) esperada no `idToken` do app: o *Web client* do projeto Firebase |
| `JWT_SECRET_KEY` e `JWT_REFRESH_SECRET_KEY` | sim | Segredos do token de acesso e do refresh token. Use valores longos e diferentes |
| `PORT` | não (8080) | Porta do servidor |
| `NODE_ENV` | não (`development`) | Ambiente |
| `RATE_LIMIT_AUTH_MAX` | não (20) | Requisições por IP a cada 15 minutos em `/auth` |
| `RATE_LIMIT_API_MAX` | não (300) | Requisições por IP a cada 15 minutos nas demais rotas |
| `TRUST_PROXY` | não (0) | Quantos proxies confiáveis ficam na frente da API (veja abaixo) |
| `LOG_LEVEL` | não (`info`) | `fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent` |

Se faltar uma variável obrigatória, a API não sobe e o erro lista o que falta.

**`TRUST_PROXY`:** atrás de um proxy ou balanceador (Render, Fly, nginx…), use o número de proxies, normalmente `1`. Com `0`, o limite de requisições conta o IP do proxy, e todos os usuários passam a dividir o mesmo limite.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor com recarga automática |
| `npm run build` e `npm start` | Compila para `dist/` e roda |
| `npm test` | Testes, com MongoDB em memória. O `.env` nunca é usado nos testes |
| `npm run typecheck` e `npm run lint` | Checagens de tipo e de estilo |
| `npm run db:migrate` | Migração de índices em dry-run: mostra o que mudaria e não altera nada |
| `npm run db:migrate -- --apply` | Aplica a migração (veja [Dados](docs/dados.md)) |
| `npm run token:dev -- <userId>` | Token de acesso para testar no Swagger |

O CI (`.github/workflows/ci.yml`) roda typecheck, lint, prettier, testes, build e `npm audit` em cada pull request.

## Documentação

- **Swagger:** com a API rodando, `http://localhost:8080/docs`; o link aparece no terminal ao subir. Para as rotas protegidas, gere um token com `npm run token:dev -- <userId>` e use o **Authorize**.
- **Documentação técnica:** [docs/README.md](docs/README.md) (arquitetura, autenticação, regras dos lançamentos, dados, erros, operação, testes e como contribuir).

## Atualização: hash do refresh token

Desde que o banco passou a guardar só o hash do refresh token, os refresh tokens emitidos antes deixaram de valer: depois dessa versão, todo mundo precisa entrar de novo. O campo antigo `refreshToken`, em texto puro, sai de cada usuário no próximo login. Para limpar todos de uma vez:

```js
db.users.updateMany({ refreshToken: { $exists: true } }, { $unset: { refreshToken: "" } })
```
