# Operação

## Variáveis de ambiente

Validadas na subida por `loadEnvironment` (`src/config/environment.config.ts`). Se faltar uma obrigatória, a API **não sobe** e o erro lista o que falta. O `.env.example` traz todas.

| Variável | Obrigatória | Padrão | Para quê |
|---|---|---|---|
| `MONGO_URI` | sim | — | Conexão com o MongoDB |
| `GOOGLE_CLIENT_ID` | sim | — | Audiência (`aud`) do `idToken`: o *Web client* do Firebase |
| `JWT_SECRET_KEY` | sim | — | Segredo do token de acesso |
| `JWT_REFRESH_SECRET_KEY` | sim | — | Segredo do refresh token (diferente do anterior) |
| `PORT` | não | 8080 | Porta |
| `NODE_ENV` | não | `development` | Ambiente; `production` bloqueia o `token:dev` |
| `RATE_LIMIT_AUTH_MAX` | não | 20 | Requisições por IP a cada 15 min em `/auth` |
| `RATE_LIMIT_API_MAX` | não | 300 | Requisições por IP a cada 15 min nas demais rotas |
| `TRUST_PROXY` | não | 0 | Proxies confiáveis na frente da API |
| `LOG_LEVEL` | não | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent` |

O `.env` nunca é versionado. Nos testes, o `vitest.config.mts` define todas as variáveis e o `MONGO_URI` aponta para um endereço que nunca conecta, para o `.env` não chegar à suíte.

## Segurança

- **`helmet()`:** cabeçalhos de segurança (`X-Content-Type-Options: nosniff`, CSP etc.) e sem `X-Powered-By`. A Swagger UI funciona com o CSP padrão.
- **Limite de requisições** (`src/middlewares/rateLimit.middleware.ts`): janela de 15 minutos por IP; um limite para `/auth` e outro para o resto. A resposta é 429 `RateLimitError`, com os cabeçalhos `RateLimit` (draft-8).
- **`TRUST_PROXY`:** atrás de um proxy ou balanceador, use o número de proxies (normalmente 1). Com 0, o limite conta o IP do proxy, e todos os usuários dividem o mesmo limite.
- **Refresh token** guardado só como hash; veja [Autenticação](autenticacao.md).

## Logs

`pino-http` (`src/config/logger.config.ts`) grava uma linha JSON por requisição: método, rota, status e tempo. O `Authorization` sai como `[Redacted]`. Erros 500 ou acima também são registrados, com a pilha. O nível vem de `LOG_LEVEL`; nos testes é `silent`.

## Swagger

- Sempre ligado: tela em `/docs` e spec em `/docs/openapi.json` (`src/docs/docs.route.ts`).
- Ao subir, o terminal mostra o link:

  ```
  Servidor na porta 8080
  Swagger: http://localhost:8080/docs
  ```

- **Testar rotas protegidas:** `npm run token:dev -- <userId>` imprime um token de 1 hora. No Swagger, **Authorize** → cole o token → *Try it out*. Os lançamentos ficam ligados a esse `userId`.

## Scripts npm

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor com recarga automática (`tsx watch`) |
| `npm run build` / `npm start` | Compila para `dist/` / roda a versão compilada |
| `npm test` / `npm run test:watch` | Testes uma vez / em modo observação |
| `npm run typecheck` | Tipos de `src/` e de `test/` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Migração de índices em dry-run; `-- --apply` aplica (veja [Dados](dados.md)) |
| `npm run token:dev -- <userId>` | Token de acesso para o Swagger (nunca em produção) |
