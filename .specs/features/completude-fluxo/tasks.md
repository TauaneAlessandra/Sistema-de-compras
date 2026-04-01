# Completude do Fluxo e Rastreabilidade — Tasks

**Spec**: `.specs/features/completude-fluxo/spec.md`
**Design**: `.specs/features/completude-fluxo/design.md`
**Status**: Aprovado
**Data**: 2026-04-01

---

## Execution Plan

```
Fase 1 — Fundação de tipos (Sequential, bloqueante)
  T01 → T02

Fase 2 — Domínio + DataContext (Sequential após T02)
  T02 → T03 → T04

Fase 3 — UI independente (Parallel após T04)
  T04 ──┬─→ T05 [P]   (página aprovações de área)
        ├─→ T06 [P]   (card areaApproval no detalhe)
        ├─→ T07 [P]   (botão + modal confirmação de estoque no detalhe)
        └─→ T08 [P]   (seção histórico no detalhe)

Fase 4 — Navegação (após T05)
  T05 → T09

Fase 5 — Zod (Parallel, independente da Fase 3)
  T04 ──┬─→ T10 [P]   (Zod nova solicitação)
        ├─→ T11 [P]   (Zod cotação)
        ├─→ T12 [P]   (Zod supervisor)
        ├─→ T13 [P]   (Zod financeiro)
        └─→ T14 [P]   (Zod aprovação de área)

Fase 6 — Testes (Sequential, após tudo)
  T15 → T16
```

---

## Task Breakdown

### T01: Adicionar `AuditEvent` e `AuditEventType` em `types.ts`

**What**: Definir o tipo `AuditEventType` (union de strings) e a interface `AuditEvent` com os campos `id`, `type`, `actorId`, `actorName`, `actorRole`, `timestamp`, `observation?`, `metadata?`
**Where**: `src/types.ts`
**Depends on**: Nenhuma
**Reuses**: Padrão das interfaces existentes no mesmo arquivo
**Requirement**: RAST-01

**Done when**:
- [ ] `AuditEventType` exportado com todos os 10 valores listados no design
- [ ] `AuditEvent` exportado com todos os campos tipados corretamente
- [ ] `tsc --noEmit` → 0 erros

---

### T02: Adicionar campo `history` em `PurchaseRequest` (types.ts)

**What**: Adicionar `history: AuditEvent[]` à interface `PurchaseRequest`
**Where**: `src/types.ts`
**Depends on**: T01
**Requirement**: RAST-01

**Done when**:
- [ ] Campo `history: AuditEvent[]` presente em `PurchaseRequest`
- [ ] `tsc --noEmit` → 0 erros (DataContext vai quebrar — esperado; será corrigido em T04)

---

### T03: Adicionar `statusAfterStockConfirmation` em `domain/workflow.ts`

**What**: Adicionar função pura `statusAfterStockConfirmation(): RequestStatus` que retorna `'fulfilled_by_stock'`
**Where**: `src/domain/workflow.ts`
**Depends on**: Nenhuma (pode ser paralela com T01/T02, mas é trivial)
**Reuses**: Padrão das outras funções `statusAfter*` no mesmo arquivo
**Requirement**: STOCK-01

**Done when**:
- [ ] Função exportada
- [ ] Retorna `'fulfilled_by_stock'`
- [ ] `tsc --noEmit` → 0 erros

---

### T04: Atualizar `DataContext` — `makeEvent` + history em todas as operações + `areaApprove` + `confirmStock`

**What**: (a) Adicionar função interna `makeEvent`; (b) adicionar `history: []` em `createRequest` e appender evento em todas as 5 operações existentes; (c) implementar `areaApprove`; (d) implementar `confirmStock`; (e) expor os dois novos métodos na interface `DataContextValue`
**Where**: `src/context/DataContext.tsx`
**Depends on**: T01, T02, T03
**Reuses**: Padrão de `supervisorApprove` para `areaApprove`; importar `statusAfterAreaDecision` e `statusAfterStockConfirmation` de `domain/workflow`
**Requirement**: RAST-02, RAST-03, RAST-04, RAST-05, RAST-06, RAST-07, RAST-08, AREA-01, STOCK-01

**Detalhes de implementação**:
- `makeEvent(type, user, observation?, metadata?)` → `AuditEvent` (função local, não exportada)
- `createRequest`: adicionar `history: [makeEvent('created', user)]` na criação do objeto
- `addQuotation`: appender `makeEvent('quotation_added', user, undefined, { quotationId, supplier })`
- `removeQuotation`: appender `makeEvent('quotation_removed', user, undefined, { quotationId })`
- `areaApprove(requestId, data: { approved, observation }, user)`: mudar status via `statusAfterAreaDecision`, preencher `areaApproval`, appender `makeEvent(data.approved ? 'area_approved' : 'area_rejected', user, data.observation)`
- `supervisorApprove`: appender `makeEvent(data.approved ? 'supervisor_approved' : 'supervisor_rejected', user, data.observation)`
- `financialApprove`: appender `makeEvent(data.approved ? 'financial_approved' : 'financial_rejected', user, data.observation)`
- `confirmStock(requestId, observation, user)`: setar `status: 'fulfilled_by_stock'`, `stockFulfilled: true`, `stockObservation: observation`, appender `makeEvent('fulfilled_by_stock', user, observation)`
- Leitura de `history` com fallback: `history: r.history ?? []` em operações que modificam solicitações existentes

**Done when**:
- [ ] `DataContextValue` tem `areaApprove` e `confirmStock` tipados
- [ ] `createRequest` inicializa `history: [makeEvent('created', user)]`
- [ ] As 5 operações existentes appended evento correto
- [ ] `areaApprove` muda status e preenche `areaApproval`
- [ ] `confirmStock` muda status e preenche campos de estoque
- [ ] `tsc --noEmit` → 0 erros
- [ ] `npm test` → todos os testes existentes passando (sem regressão)

---

### T05: Criar página de aprovações de área [P]

**What**: Criar `pages/approvals/area/index.tsx` e `pages/approvals/area/AreaApprovalCard.tsx` — lista de solicitações em `pending_area_approval` com formulário de aprovação/reprovação inline
**Where**: `src/pages/approvals/area/`
**Depends on**: T04
**Reuses**: Estrutura idêntica a `pages/approvals/supervisor/` — clonar e adaptar (sem campo `selectedQuotationId`)
**Requirement**: AREA-02

**Detalhes**:
- `index.tsx`: filtrar `requests` por `status === 'pending_area_approval'`; exibir mensagem de vazio quando lista vazia
- `AreaApprovalCard.tsx`: campos do form: `approved` (radio/buttons), `observation` (textarea, obrigatório); chamar `areaApprove` do contexto

**Done when**:
- [ ] Página renderiza lista de solicitações em `pending_area_approval`
- [ ] Card tem botões "Aprovar" e "Reprovar" com campo de observação
- [ ] Ao aprovar, status muda para `pending_quotation`
- [ ] Ao reprovar, status muda para `rejected`
- [ ] `tsc --noEmit` → 0 erros

---

### T06: Adicionar card de `areaApproval` no detalhe [P]

**What**: Exibir card com dados de `areaApproval` na página de detalhe, quando `request.areaApproval !== null`
**Where**: `src/pages/requests/detail/index.tsx`
**Depends on**: T04
**Reuses**: Padrão do card `supervisorApproval` (linhas 238-269 do arquivo atual) — clonar estrutura
**Requirement**: AREA-04

**Done when**:
- [ ] Card aparece apenas quando `request.areaApproval !== null`
- [ ] Exibe: decisão (aprovado/reprovado), nome do aprovador, data, observação
- [ ] Visível para todos os roles (é informação, não ação)
- [ ] `tsc --noEmit` → 0 erros

---

### T07: Adicionar botão "Atender por Estoque" e modal inline no detalhe [P]

**What**: Na seção de cotações, exibir botão "Atender por Estoque" para `buyer`/`admin` quando `status === 'pending_quotation'`; ao clicar, mostrar campo `observation` (opcional) e botão de confirmação que chama `confirmStock`
**Where**: `src/pages/requests/detail/index.tsx`
**Depends on**: T04
**Reuses**: Padrão do `showQuotationForm` (boolean state) já existente no mesmo arquivo
**Requirement**: STOCK-02, STOCK-03

**Detalhes**:
- Estado booleano `showStockForm` controla visibilidade
- Form inline: `<textarea>` para observação (opcional) + "Confirmar" + "Cancelar"
- Após confirmação: chama `confirmStock(request.id, observation, user!)` e `refresh()`
- Card informativo quando `request.stockFulfilled`: exibe `stockObservation` e a entrada do histórico com quem encerrou

**Done when**:
- [ ] Botão aparece somente para `buyer`/`admin` em `pending_quotation`
- [ ] Form inline aparece/desaparece corretamente
- [ ] Após confirmação, status muda para `fulfilled_by_stock`
- [ ] Card informativo exibido quando `stockFulfilled === true`
- [ ] `tsc --noEmit` → 0 erros

---

### T08: Adicionar seção "Histórico" no detalhe [P]

**What**: Adicionar card "Histórico" ao final da página de detalhe, listando `request.history` em ordem cronológica com ícone, ator, role, timestamp e observação
**Where**: `src/pages/requests/detail/index.tsx`
**Depends on**: T02 (tipo), T04 (history[] populado)
**Reuses**: Ícones já importados de `lucide-react` no mesmo arquivo
**Requirement**: RAST-09

**Mapeamento de ícones por tipo de evento**:
- `created` → `Plus`
- `quotation_added` → `DollarSign`
- `quotation_removed` → `Trash2`
- `area_approved` → `CheckCircle2`
- `area_rejected` → `XCircle`
- `supervisor_approved` → `CheckCircle2`
- `supervisor_rejected` → `XCircle`
- `financial_approved` → `CheckCircle2`
- `financial_rejected` → `XCircle`
- `fulfilled_by_stock` → `Package` (importar)

**Done when**:
- [ ] Seção renderiza todos os eventos de `request.history`
- [ ] Histórico vazio exibe mensagem "Nenhum evento registrado"
- [ ] Solicitação sem campo `history` (legada) não quebra (fallback `?? []`)
- [ ] Cada item exibe: ícone, tipo formatado em PT-BR, nome+role do ator, data/hora
- [ ] `tsc --noEmit` → 0 erros

---

### T09: Adicionar item "Aprovações de Área" no sidebar

**What**: Adicionar item de menu no `Layout.tsx` para a rota `/aprovacoes/area`, visível apenas para `area_manager` e `admin`; adicionar a rota em `App.tsx`
**Where**: `src/components/Layout.tsx` + `src/App.tsx`
**Depends on**: T05
**Reuses**: Padrão dos outros itens de aprovação no sidebar
**Requirement**: AREA-03

**Done when**:
- [ ] Item "Aprovações de Área" visível no sidebar para `area_manager` e `admin`
- [ ] Item oculto para outros roles
- [ ] Rota `/aprovacoes/area` configurada em `App.tsx`
- [ ] Navegação funciona corretamente
- [ ] `tsc --noEmit` → 0 erros

---

### T10: Zod — schema em `pages/requests/new/index.tsx` [P]

**What**: Instalar `zod` (se ausente) e adicionar `newRequestSchema` com validação inline nos campos; exibir erros por campo abaixo dos inputs
**Where**: `src/pages/requests/new/index.tsx`
**Depends on**: T04 (independente das tasks de UI do fluxo, mas T04 garante types estáveis)
**Requirement**: VALID-01

**Schema**:
```typescript
const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  quantity: z.coerce.number().positive('Deve ser maior que zero'),
  unit: z.string().min(1, 'Campo obrigatório'),
  urgency: z.enum(['low', 'medium', 'urgent']),
  justification: z.string().min(10, 'Mínimo 10 caracteres'),
})
```

**Done when**:
- [ ] Submit com campos vazios exibe erros inline por campo
- [ ] Submit com dados válidos funciona normalmente
- [ ] `tsc --noEmit` → 0 erros

---

### T11: Zod — schema em `QuotationForm.tsx` [P]

**What**: Adicionar `quotationSchema` com validação nos campos `supplier`, `price`, `deliveryDays`
**Where**: `src/pages/requests/detail/QuotationForm.tsx`
**Depends on**: T04
**Requirement**: VALID-02

**Schema**:
```typescript
const schema = z.object({
  supplier: z.string().min(2, 'Mínimo 2 caracteres'),
  price: z.coerce.number().positive('Deve ser maior que zero'),
  deliveryDays: z.coerce.number().int().positive('Deve ser inteiro positivo'),
  observations: z.string(),
})
```

**Done when**:
- [ ] `price <= 0` bloqueia submit com mensagem
- [ ] `deliveryDays <= 0` bloqueia submit com mensagem
- [ ] Dados válidos submetem normalmente
- [ ] `tsc --noEmit` → 0 erros

---

### T12: Zod — schema em `ApprovalCard.tsx` (supervisor) [P]

**What**: Adicionar validação Zod: `selectedQuotationId` obrigatório quando `approved=true`, `observation` mínimo 5 caracteres
**Where**: `src/pages/approvals/supervisor/ApprovalCard.tsx`
**Depends on**: T04
**Requirement**: VALID-03

**Done when**:
- [ ] Aprovar sem selecionar cotação exibe erro
- [ ] `observation` com menos de 5 chars bloqueia submit
- [ ] `tsc --noEmit` → 0 erros

---

### T13: Zod — schema em `FinancialCard.tsx` [P]

**What**: Adicionar validação Zod: `purchaseDate` obrigatório quando `approved=true`, `observation` mínimo 5 caracteres
**Where**: `src/pages/approvals/financial/FinancialCard.tsx`
**Depends on**: T04
**Requirement**: VALID-04

**Done when**:
- [ ] Aprovar sem `purchaseDate` exibe erro
- [ ] `observation` com menos de 5 chars bloqueia submit
- [ ] `tsc --noEmit` → 0 erros

---

### T14: Zod — schema em `AreaApprovalCard.tsx` [P]

**What**: Adicionar validação Zod: `observation` mínimo 5 caracteres (obrigatório para aprovar e reprovar)
**Where**: `src/pages/approvals/area/AreaApprovalCard.tsx`
**Depends on**: T05 (arquivo criado em T05)
**Requirement**: VALID-05

**Done when**:
- [ ] Submit sem observação bloqueia com mensagem
- [ ] Submit com observação válida funciona
- [ ] `tsc --noEmit` → 0 erros

---

### T15: Adicionar testes de domínio para `statusAfterStockConfirmation`

**What**: Adicionar casos de teste em `workflow.test.ts` para a nova função `statusAfterStockConfirmation`
**Where**: `src/domain/workflow.test.ts`
**Depends on**: T03
**Requirement**: STOCK-01

**Done when**:
- [ ] Pelo menos 1 teste: `statusAfterStockConfirmation()` retorna `'fulfilled_by_stock'`
- [ ] `npm test` → todos os testes passando

---

### T16: Adicionar testes de domínio para `history[]` no DataContext (integração leve)

**What**: Adicionar testes em `workflow.test.ts` verificando que `makeEvent` produziria os campos corretos — testar o tipo `AuditEvent` diretamente (criação de objeto + verificação de campos)
**Where**: `src/domain/workflow.test.ts`
**Depends on**: T01, T15
**Requirement**: RAST-01

**Done when**:
- [ ] Teste cria `AuditEvent` e verifica campos obrigatórios presentes
- [ ] `npm test` → todos os testes passando
- [ ] `tsc --noEmit` → 0 erros

---

## Parallel Execution Map

```
Fase 1 (Sequential — fundação):
  T01 ──→ T02

Fase 2 (Sequential — domínio e contexto):
  T02 ──→ T03 ──→ T04
  (T03 pode ser paralela com T01/T02, mas T04 depende dos 3)

Fase 3+5 (Parallel — UI e Zod, após T04):
  T04 complete, então em paralelo:
    ├── T05 [P] → T09
    ├── T06 [P]
    ├── T07 [P]
    ├── T08 [P]
    ├── T10 [P]
    ├── T11 [P]
    ├── T12 [P]
    └── T13 [P]
  T05 complete → T14

Fase 6 (Sequential — testes):
  T03 complete → T15 → T16
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T01 | 1 tipo novo em 1 arquivo | ✅ |
| T02 | 1 campo em 1 interface | ✅ |
| T03 | 1 função em 1 arquivo | ✅ |
| T04 | 1 arquivo, múltiplas funções relacionadas | ⚠️ Coeso — todas as operações do DataContext. Pode ser dividida se necessário, mas a dependência entre elas (makeEvent) tornaria a divisão artificial |
| T05 | 2 arquivos novos (página + card) | ✅ Coeso |
| T06 | 1 bloco JSX em 1 arquivo | ✅ |
| T07 | 1 bloco JSX + 1 state em 1 arquivo | ✅ |
| T08 | 1 seção JSX em 1 arquivo | ✅ |
| T09 | 2 arquivos (sidebar + router) | ✅ Coeso |
| T10–T14 | 1 schema + erros por arquivo | ✅ |
| T15–T16 | 1 grupo de testes por arquivo | ✅ |

---

## Checklist de dependências de pacotes

Antes de T10, verificar:
- [ ] `zod` instalado? (`grep "zod" package.json`)
- [ ] `react-hook-form` instalado? (`grep "react-hook-form" package.json`)

Se não instalados, adicionar como primeiro passo de T10.
