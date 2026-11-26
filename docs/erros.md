# Erros

## Formato

Todo erro sai no mesmo formato, inclusive 404 de rota e 429:

```json
{
  "name": "ValidationError",
  "code": 400,
  "message": "Erro de validação",
  "errors": [{ "field": "value", "message": "Valor deve ser maior que zero" }]
}
```

No Swagger, é o schema `Error`.

## Tipos (`name`)

Definidos em `NameError` (`src/middlewares/types.ts`):

| `name` | Quando |
|---|---|
| `ValidationError` | Corpo ou parâmetro inválido, JSON malformado |
| `AuthError` | Sem token, token inválido, login recusado, refresh inválido |
| `NotFoundError` | Rota inexistente, lançamento ou parcela que não existe (ou é de outro usuário) |
| `DatabaseError` | Erros do MongoDB: id malformado, nome repetido, rede |
| `RateLimitError` | Limite de requisições atingido |
| `InternalServerError` | Qualquer erro não previsto |

## Como um erro vira resposta

- **Erros previstos** são lançados como `AppError(status, mensagem, { name, errors })` (`src/middlewares/errorHandler.middleware.ts`).
- **Validação com zod:** `validateBody` e `validateParams` transformam cada problema em `{ field, message }`.
- **Erros do Mongoose:** `getErrorMongo` (`src/config/mapErrorMongo.config.ts`) traduz:

  | Erro do Mongo | Resposta |
  |---|---|
  | `CastError` (id malformado) | 400 `ID malformado ou tipo inválido` |
  | `ValidationError` | 400, com os campos (`Campo obrigatório.` para os que faltam) |
  | Código 11000 (chave duplicada) | 409 `Chave duplicada` |
  | Erro de rede | 503 |

- **`errorHandler`** é o último middleware: `AppError` sai com o próprio status; JSON malformado (`entity.parse.failed`) vira 400 `JSON inválido`; o resto vira 500.
- **Logs:** só erros 500 ou acima são registrados (`req.log.error`). 4xx são comportamento esperado e não poluem o log.

## Mensagens

Todas em pt-BR:

- as da API ficam em `ERROR_MESSAGES` (`src/utils/errorMessages.ts`);
- as padrão do zod saem em português por causa do `z.config(z.locales.pt())` em `src/app.ts`;
- as de regra de negócio (por exemplo, `Em parcelados, marque o realizado em cada parcela.`) vêm do service, no campo `errors`.

## Status

| Status | Quando |
|---|---|
| 400 | Corpo, parâmetro ou JSON inválido; id malformado; regra de negócio violada |
| 401 | Sem `Authorization`, login recusado, refresh inválido |
| 403 | Token de acesso inválido ou expirado |
| 404 | Rota inexistente; lançamento ou parcela inexistente ou de outro usuário |
| 409 | Nome repetido para o mesmo usuário |
| 429 | Limite de requisições |
| 500 / 503 | Erro inesperado / banco fora do ar |
