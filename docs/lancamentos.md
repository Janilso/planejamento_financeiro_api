# Lançamentos

As regras ficam em `src/services/balance.service.ts` (`BalanceService`) e a validação de entrada em `src/schemas/balance.schema.ts`.

## Campos

| Campo | Regra |
|---|---|
| `name` | Obrigatório; espaços nas pontas são removidos; **único por usuário** |
| `value` | Reais, no mínimo 0,01 e no máximo 2 casas decimais. Em parcelado, é o **valor total** |
| `type` | `gains` (ganho) ou `expenses` (gasto) |
| `installment` | Inteiro ≥ 1 (na criação, sempre 1) |
| `totalInstallments` | Inteiro de 0 a 30. **0 ou 1 = à vista**; 2 a 30 = parcelado |
| `date` | Data ISO ou milissegundos; é a data do lançamento (ou da 1ª parcela) |
| `realized` | Se já aconteceu; padrão `false` |

## Parcelas

Com `totalInstallments > 1`, a API gera as parcelas dentro do próprio documento, em `listInstallments` (`generateListInstallments`):

- **Valor em centavos:** o total é convertido em centavos e dividido; as parcelas 1 a n−1 recebem a parte inteira e **o resto vai para a última**. R$ 100 em 3x = 33,33 + 33,33 + 33,34. A soma sempre fecha.
- **No mínimo R$ 0,01 por parcela:** R$ 0,02 em 3x é recusado com 400 (`assertCentsPerInstallment`).
- **Uma por mês:** a parcela *i* vence `i − 1` meses depois da data, somando os meses **no calendário de São Paulo**. Uma compra em 30/03 às 23h (horário de Brasília) tem a 2ª parcela em 30/04 às 23h, e não em 29/04. As datas são gravadas em ISO UTC (`…Z`).

## Fuso e chave do mês

O mês de cada item é calculado em `America/Sao_Paulo` (`src/utils/timeZone.ts` e `src/utils/dateToMonthYear.ts`), seja qual for o fuso do servidor. A chave é `MMM/yy` em pt-BR e maiúsculas: `NOV/26`. Um lançamento em 01/03 às 02:00 UTC (28/02 às 23h em São Paulo) fica em `FEV/26`.

## Listagem (`GET /balances`)

1. Busca os lançamentos do usuário.
2. Transforma cada um em itens (`factoryGetBalanceResponse`): o à vista vira um item; o parcelado vira um item por parcela.
3. Agrupa pela chave do mês e separa `gains` de `expenses` (`generateListInstallmentsByUser`).

Cada item tem o `id` do **lançamento** (o mesmo em todas as parcelas), o `value` da parcela e o `totalValue` do lançamento inteiro. O app usa o `totalValue` ao editar um parcelado.

## Edição (`PATCH /balances/:id`, `BalanceService.update`)

Só os campos enviados mudam. O lançamento precisa ser do usuário (senão, 404).

| Situação | O que acontece |
|---|---|
| Mudou só `name` ou `type` | Lançamento e parcelas atualizados; nada é refeito |
| Mudou `value`, `totalInstallments` ou `date`, e continua parcelado | **As parcelas são refeitas.** Cada parcela mantém o `realized` que tinha, pelo número. Uma parcela excluída antes volta a existir |
| Ficou com 0 ou 1 parcela | Vira à vista: `listInstallments` vazia; o `realized` herda o da parcela 1, se não vier no corpo |
| À vista virando parcelado | As parcelas herdam o `realized` do lançamento |
| `realized` num parcelado | **Recusado com 400**: o realizado de parcelado é por parcela |

O `updatedAt` é gravado a cada edição.

## Realizado por parcela (`PATCH /balances/:id/installments/:n`)

Muda só o `realized` da parcela *n*. Em lançamento à vista, ou com *n* maior que o número de parcelas, responde 404 (`Parcela não encontrada`).

## Exclusão

| Rota | Efeito |
|---|---|
| `DELETE /balances/:id` | Apaga o lançamento com todas as parcelas |
| `DELETE /balances/:id/installments/:n` | Tira só a parcela *n* de `listInstallments`. Se não sobrar nenhuma, apaga o lançamento |

Lançamento de outro usuário responde 404 nas duas, e nada é apagado.
