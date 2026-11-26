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
| `npm run db:migrate -- --apply` | Aplica a migração |

O CI (`.github/workflows/ci.yml`) roda typecheck, lint, prettier, testes, build e `npm audit` em cada pull request.

## Endpoints

As rotas de `/balances` e o logout exigem `Authorization: Bearer <token>`. O token cru, sem `Bearer`, também é aceito, por compatibilidade.

| Rota | Corpo | Resposta |
|---|---|---|
| `POST /auth/login` | `{ googleToken }` (o `idToken` do Google) | 200 `{ token, refreshToken }` |
| `POST /auth/refresh` | `{ refreshToken }` | 200 `{ token, refreshToken }` (os dois são novos) |
| `POST /auth/logout` | — | 204; revoga o refresh token |
| `GET /balances` | — | 200 `{ "NOV/26": { gains: [...], expenses: [...] } }` |
| `POST /balances` | `{ name, value, type, installment, totalInstallments?, date, realized? }` | 201, com o lançamento criado |
| `PATCH /balances/:id` | um ou mais de `{ name, value, type, totalInstallments, date, realized }` | 200, com o lançamento atualizado |
| `PATCH /balances/:id/installments/:n` | `{ realized }` | 200 |
| `DELETE /balances/:id` | — | 204; apaga o lançamento com todas as parcelas |
| `DELETE /balances/:id/installments/:n` | — | 204. Se não sobrar parcela, o lançamento também é apagado |

Validade dos tokens: o de acesso vale 1 hora e o refresh vale 15 dias. O banco guarda só o hash sha256 do refresh token.

Todo erro sai no mesmo formato:

```json
{ "name": "ValidationError", "code": 400, "message": "Erro de validação", "errors": [{ "field": "value", "message": "Valor deve ser maior que zero" }] }
```

| Status | Quando |
|---|---|
| 400 | Corpo ou parâmetro inválido, JSON malformado ou id malformado |
| 401 | Sem token, login recusado, refresh inválido |
| 403 | Token inválido ou expirado |
| 404 | Rota inexistente, ou lançamento ou parcela que não existe ou é de outro usuário |
| 409 | Nome já usado pelo mesmo usuário |
| 429 | Limite de requisições atingido |

## Regras dos lançamentos

- **Valores** são em reais, com 2 casas, e o mínimo é R$ 0,01.
- **Parceladas** (`totalInstallments` de 2 a 30): a API gera as parcelas dentro do próprio lançamento, uma por mês. O valor é dividido em centavos, e o resto vai para a última parcela: R$ 100 em 3x fica 33,33 + 33,33 + 33,34.
- **Fuso:** o mês de cada lançamento e o vencimento das parcelas são calculados em `America/Sao_Paulo`, seja qual for o fuso do servidor.
- **O nome é único por usuário.**
- **Editar a série reconstrói as parcelas.** Se um `PATCH /balances/:id` mudar o valor, o número de parcelas ou a data, as parcelas são geradas de novo. Cada parcela mantém o "realizado" que tinha, pelo número dela. Uma parcela excluída sozinha volta a existir nesse caso. Com 1 parcela ou menos, o lançamento vira à vista.
- **Realizado de parcelado** se marca em cada parcela, pela rota `/installments/:n`. Num `PATCH /balances/:id` de um parcelado, `realized` é recusado com 400.

## Migração de índices

Versões antigas tinham um índice único só em `name`, que impedia dois usuários de usarem o mesmo nome. A migração troca esse índice pelo índice único `{ userId, name }`.

1. Rode `npm run db:migrate`, que é só um dry-run. Pare se o `toDrop` trouxer algum índice além do `name_1` ou se `duplicates` não vier vazio. Nomes repetidos para o mesmo usuário precisam ser resolvidos antes.
2. Rode `npm run db:migrate -- --apply`. O índice novo é criado antes de o antigo sair.

A CLI nunca imprime a `MONGO_URI`.

## Atualização: hash do refresh token

Desde que o banco passou a guardar só o hash do refresh token, os refresh tokens emitidos antes deixaram de valer. **Depois desse deploy, todo mundo precisa entrar de novo.** O app volta ao login sozinho, com o aviso de sessão expirada.

O campo antigo `refreshToken`, em texto puro, sai de cada usuário no próximo login. Para limpar todos de uma vez:

```js
db.users.updateMany({ refreshToken: { $exists: true } }, { $unset: { refreshToken: "" } })
```
