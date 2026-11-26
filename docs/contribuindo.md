# Contribuindo

## Rota nova, passo a passo

1. **Teste primeiro** (`test/*.test.ts`): o comportamento esperado, incluindo os erros. Rode e veja falhar.
2. **Schema zod** em `src/schemas/`: o corpo e os parâmetros. Mensagens em pt-BR.
3. **Rota** em `src/routes/`: `authMiddleware` (se for protegida), `validateParams`, `validateBody` e o controller dentro de `asyncHandler`.
4. **Controller** em `src/controllers/`: lê `req`, chama o service, escolhe o status.
5. **Service** em `src/services/`: a regra. Filtre sempre por `{ _id, userId }`, para o dado de outro usuário virar 404.
6. **Erros previstos** com `AppError` e mensagens novas em `src/utils/errorMessages.ts`.
7. **Spec** em `src/docs/openapi.ts`: o caminho, os status e os exemplos. Para o corpo, use `zodToSchema(SeuSchema)`. O teste de cobertura falha enquanto a rota não estiver no spec.
8. **Contrato:** acrescente a chamada em `respostas reais seguem o spec` (`test/docs.test.ts`).
9. **Documentação:** atualize o arquivo de `docs/` que trata do assunto.

## Gate antes de abrir PR

```sh
npm test && npm run typecheck && npm run lint && npm run build
npx prettier --check 'src/**/*.ts' 'test/**/*.ts' vitest.config.mts
npm audit
```

## Convenções

- Commits em pt-BR: `feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`, `style:`.
- Código formatado com Prettier.
- Mudança de índice ou de formato de dado precisa de migração em `src/migrations/`, com dry-run por padrão.
- Nunca imprimir a `MONGO_URI` nem segredos.
