# Dados (MongoDB)

Os models ficam em `src/models/`. A conexão usa `MONGO_URI` (`src/config/database.config.ts`); se ela falhar, o processo encerra.

## Coleção `users` (`UserModel`)

| Campo | Tipo | Observação |
|---|---|---|
| `name` | string | Obrigatório, do Google |
| `email` | string | Obrigatório e **único**; é a chave do login |
| `picture` | string | Foto do Google |
| `refreshTokenHash` | string | sha256 do refresh token atual; vazio = sem sessão |

## Coleção `balances` (`BalanceModel`)

| Campo | Tipo | Observação |
|---|---|---|
| `userId` | string | Dono do lançamento (id do usuário) |
| `name` | string | Único por usuário |
| `value` | number | Valor total, em reais |
| `realized` | boolean | Realizado do lançamento à vista |
| `type` | string | `gains` ou `expenses` |
| `installment` | number | Sempre 1 no lançamento |
| `totalInstallments` | number | 0 ou 1 = à vista |
| `date` | string | ISO UTC |
| `createdAt` / `updatedAt` | string | ISO UTC; `updatedAt` só depois de uma edição |
| `listInstallments` | array | Parcelas embutidas (vazio quando à vista) |

Cada item de `listInstallments` tem `name`, `value` (da parcela), `realized`, `installment`, `totalInstallments`, `type`, `date` e `userId`, sem `_id` próprio. As parcelas ficam **dentro** do lançamento: editar e excluir são operações num documento só.

## Índices

| Coleção | Índice | Para quê |
|---|---|---|
| `users` | `email` único | Um usuário por e-mail |
| `balances` | `{ userId: 1, name: 1 }` único | Nome único por usuário. Um nome repetido gera erro 11000, que vira 409 |

O Mongoose cria os índices do schema ao conectar (`autoIndex`), mas **nunca remove** os que saíram do schema.

## Migração de índices (`src/migrations/`)

Versões antigas tinham o índice único `name_1`, que impedia **dois usuários** de usarem o mesmo nome. A migração troca esse índice pelo `{ userId, name }`.

```sh
npm run db:migrate             # dry-run: mostra toDrop, toCreate e duplicates; não altera nada
npm run db:migrate -- --apply  # aplica
```

- O dry-run conecta com `autoIndex: false` e `autoCreate: false`, para não criar nada só por conectar.
- **Repetidos:** procura nomes repetidos para o mesmo usuário, juntando `userId` ausente e `null` (`$ifNull`). Se houver, o `--apply` é recusado.
- **Ordem segura:** cria o índice novo antes de remover o antigo (`createIndexes` e depois `cleanIndexes`). Se a criação falhar, o `name_1` continua.
- A CLI nunca imprime a `MONGO_URI`, só o host e o nome do banco.

Num banco novo, sem dados antigos, a migração não é necessária.
