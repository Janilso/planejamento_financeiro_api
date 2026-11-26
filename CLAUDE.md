# API do Planejamento Financeiro

API Node/TypeScript (Express 5, Mongoose 9, zod 4) de um app pessoal de finanças que mostra ganhos e gastos mês a mês. O app Flutter fica em `/home/janilso/projetos/mobile/planejamento_financeiro`. A documentação técnica está em `docs/` (índice em `docs/README.md`) e o contrato das rotas no Swagger (`src/docs/openapi.ts`, servido em `/docs`).

## Comandos

- `npm run dev`: servidor com recarga (tsx), porta 8080.
- `npm test`: Vitest + supertest + MongoDB em memória (nunca usa o `.env`).
- `npm run typecheck`, `npm run lint`, `npm run build`.
- `npx prettier --check 'src/**/*.ts' 'test/**/*.ts' vitest.config.mts`.
- `npm run db:migrate`: dry-run dos índices; `-- --apply` aplica.
- `npm run token:dev -- <userId>`: token de acesso para testar no Swagger (`/docs`).

## Convenções

- Commits em pt-BR, no padrão `fix:`, `feat:`, `test:`, `docs:`, `ci:`, `chore:`, `style:`.
- TDD: o teste vem antes e precisa falhar pelo motivo certo.
- Erros saem como `{ name, code, message, errors: [{ field, message }] }`, com mensagens em pt-BR em `src/utils/errorMessages.ts`.
- Ao criar ou mudar uma rota, atualize `src/docs/openapi.ts`: o `test/docs.test.ts` falha se uma rota não estiver no spec ou se a resposta real não bater com ele. Atualize também o arquivo de `docs/` do assunto.
- Testes nunca importam `src/server.ts`. Use `await doc.validate()` (o `validateSync()` está deprecado) e nunca `dropDatabase()` entre testes.

## Armadilhas

- O MongoDB real é um Atlas inacessível do sandbox. Nunca conecte nele nem leia o `.env`: operações no banco real são passo do usuário.
- `db:migrate` sempre em dry-run primeiro; pare se o `toDrop` trouxer algo além do esperado.
- O nome do lançamento é único por usuário (índice `{ userId, name }`).
- O mês dos lançamentos ("MMM/YY") é calculado em pt-BR, no fuso America/Sao_Paulo; datas de teste ficam no dia 15 às 12:00Z.
