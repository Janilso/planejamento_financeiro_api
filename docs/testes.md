# Testes

```sh
npm test            # roda tudo uma vez
npm run test:watch  # modo observação
```

Vitest + supertest, com um **MongoDB em memória** (`mongodb-memory-server`). A suíte nunca usa o `.env` nem o banco real.

## Como a suíte é montada

| Arquivo | Papel |
|---|---|
| `vitest.config.mts` | Variáveis de ambiente dos testes: segredos falsos, `MONGO_URI` que nunca conecta, limites altos, `LOG_LEVEL=silent` e `TZ=UTC` |
| `test/global-setup.ts` | Sobe um MongoDB em memória por execução e passa a URI com `provide('mongoUri')` |
| `test/setup.ts` | Por arquivo: conecta num banco com nome aleatório, cria os índices, **limpa as coleções antes de cada teste** e apaga o banco no fim |
| `test/helpers.ts` | `api` (supertest), `makeToken(userId)`, `mockGoogle(payload)`, `balancePayload(overrides)` e `expectMatchesSpec(res, method, path)` |

- **`TZ=UTC`:** o fuso da máquina não pode esconder erro de fuso. As datas de teste ficam no dia 15 às 12:00Z, longe da virada do mês.
- **Testes nunca importam `src/server.ts`**, só o `app`: não abrem porta nem conectam no banco real.
- **Google:** `mockGoogle` substitui o `verifyIdToken`; nenhum teste fala com o Google.

## O que cada arquivo cobre

| Arquivo | Cobre |
|---|---|
| `auth.test.ts` | Login, refresh, logout, `Bearer`, hash do refresh, `email_verified` |
| `balances.test.ts` | Criação, parcelas, centavos, fuso, agrupamento, nome único |
| `balances-edit.test.ts` | Edição, realizado por parcela, exclusões, `totalValue` |
| `errors.test.ts` | JSON malformado e rota inexistente |
| `environment.test.ts` | Validação das variáveis e padrões |
| `mapErrorMongo.test.ts` | Tradução dos erros do Mongoose |
| `migrations.test.ts` | Migração de índices, incluindo a CLI em dry-run |
| `models.test.ts` | Schemas do Mongoose |
| `security.test.ts` / `rate-limit.test.ts` | Cabeçalhos do helmet / limite de login |
| `logger.test.ts` | Token oculto nos logs |
| `docs.test.ts` | Spec válido, cobertura das rotas, contrato das respostas, Swagger e `token:dev` |

## Padrões

- **TDD:** o teste vem antes e precisa falhar pelo motivo certo.
- **Contrato do Swagger:** `docs.test.ts` falha se uma rota do Express não estiver no spec (ou o contrário), e `expectMatchesSpec` valida as respostas reais das chamadas do teste `respostas reais seguem o spec` contra os schemas documentados. Se uma dessas respostas mudar de formato, o teste falha até o spec ser atualizado.
- **Variável de ambiente diferente num arquivo:** use `vi.hoisted` antes dos imports, como em `rate-limit.test.ts`. Cada arquivo de teste tem os próprios módulos, então os outros não são afetados.
- Use `await doc.validate()` (o `validateSync()` está deprecado) e nunca `dropDatabase()` entre testes.

## CI

`.github/workflows/ci.yml` roda em cada pull request e em push na `main`: `npm ci`, typecheck, lint, prettier `--check`, testes, build e `npm audit --audit-level=high`. O binário do MongoDB fica em cache (`~/.cache/mongodb-binaries`).
