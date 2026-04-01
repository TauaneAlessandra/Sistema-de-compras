# Completude do Fluxo e Rastreabilidade — Design

**Spec**: `.specs/features/completude-fluxo/spec.md`
**Status**: Aprovado
**Data**: 2026-04-01

---

## Architecture Overview

Nenhuma nova camada é introduzida. O design expande as camadas existentes:

```
types.ts          ← novo tipo AuditEvent + history[] em PurchaseRequest
domain/workflow   ← nova função statusAfterStockConfirmation (pura)
DataContext       ← 2 novas operações (areaApprove, confirmStock) + history em todas
pages/approvals/area/  ← nova página (segue padrão de supervisor/ e financial/)
pages/requests/detail/ ← nova seção de histórico + card de área + botão estoque
pages/requests/new/    ← Zod schema
pages/requests/detail/QuotationForm ← Zod schema
pages/approvals/supervisor/ApprovalCard ← Zod schema
pages/approvals/financial/FinancialCard ← Zod schema
```

Fluxo de dados — sem mudança estrutural. A camada de contexto continua sendo o único
ponto de escrita; páginas só chamam funções do contexto.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Componente | Localização | Como reutilizar |
|---|---|---|
| `ApprovalCard` (supervisor) | `pages/approvals/supervisor/ApprovalCard.tsx` | Clonar padrão para `AreaApprovalCard` |
| `FinancialCard` | `pages/approvals/financial/FinancialCard.tsx` | Clonar padrão para `AreaApprovalCard` |
| `pages/approvals/supervisor/index.tsx` | — | Clonar estrutura de lista para área |
| Card de `supervisorApproval` no detalhe | `detail/index.tsx` linhas 238-269 | Clonar para card de `areaApproval` |
| `statusAfterSupervisorDecision` | `domain/workflow.ts` | Padrão para `statusAfterStockConfirmation` |
| `STATUS_MAP` | `detail/index.tsx` | Já tem entrada para `fulfilled_by_stock` |

### Integration Points

| Sistema | Método |
|---|---|
| `DataContextValue` | Adicionar `areaApprove` e `confirmStock` à interface |
| `PurchaseRequestRepository` | Sem mudança — persiste `PurchaseRequest` inteiro |
| `domain/workflow.ts` | Adicionar `statusAfterStockConfirmation` |
| `Layout.tsx` (sidebar) | Adicionar item de menu para aprovações de área |

---

## Data Models

### AuditEvent (novo tipo em `types.ts`)

```typescript
export type AuditEventType =
  | 'created'
  | 'area_approved'
  | 'area_rejected'
  | 'quotation_added'
  | 'quotation_removed'
  | 'supervisor_approved'
  | 'supervisor_rejected'
  | 'financial_approved'
  | 'financial_rejected'
  | 'fulfilled_by_stock'

export interface AuditEvent {
  id: string             // crypto.randomUUID()
  type: AuditEventType
  actorId: string
  actorName: string
  actorRole: UserRole
  timestamp: string      // ISO 8601
  observation?: string   // quando houver (aprovações, rejeições, estoque)
  metadata?: Record<string, string>  // ex: { quotationId, supplier } para cotações
}
```

**Relacionamento**: campo `history: AuditEvent[]` adicionado a `PurchaseRequest`.
Default `[]` — solicitações legadas (sem o campo) são lidas com fallback `?? []`.

### PurchaseRequest (modificação)

```typescript
// Adicionar ao final da interface existente:
history: AuditEvent[]   // linha do tempo cronológica de todos os eventos
```

### Função helper (interna ao DataContext)

```typescript
function makeEvent(
  type: AuditEventType,
  user: SafeUser,
  observation?: string,
  metadata?: Record<string, string>
): AuditEvent {
  return {
    id: crypto.randomUUID(),
    type,
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    timestamp: new Date().toISOString(),
    observation,
    metadata,
  }
}
```

Esta função é definida dentro do `DataProvider` (não exportada) e reutilizada por todas
as 6 operações. Zero duplicação.

---

## Components

### `domain/workflow.ts` — nova função

- **Purpose**: Calcular próximo status após confirmação de estoque
- **Location**: `src/domain/workflow.ts`
- **Interfaces**:
  - `statusAfterStockConfirmation(): RequestStatus` — retorna sempre `'fulfilled_by_stock'`
- **Reuses**: padrão das outras funções `statusAfter*`

### `DataContext` — 2 novas operações

**`areaApprove(requestId, data, user)`**
- Valida que status é `pending_area_approval` (guard inline)
- Chama `statusAfterAreaDecision(data.approved)` (já existe no domínio)
- Preenche `areaApproval`
- Appenda evento ao `history[]` via `makeEvent`

**`confirmStock(requestId, observation, user)`**
- Valida que status é `pending_quotation`
- Seta `status: 'fulfilled_by_stock'`, `stockFulfilled: true`, `stockObservation`
- Appenda evento `fulfilled_by_stock` ao `history[]`

**Operações existentes** — cada uma recebe `+history: [...r.history, makeEvent(...)]`:
`createRequest`, `addQuotation`, `removeQuotation`, `supervisorApprove`, `financialApprove`

### `pages/approvals/area/` — nova página

- **Purpose**: Listar e agir sobre solicitações em `pending_area_approval`
- **Location**: `src/pages/approvals/area/index.tsx` + `AreaApprovalCard.tsx`
- **Reuses**: estrutura exata de `pages/approvals/supervisor/`
- **Diferenças**: sem `selectedQuotationId` (área não escolhe cotação); campos do form: apenas `observation` + `approved`

### `pages/requests/detail/index.tsx` — 3 adições

1. **Card `areaApproval`**: exibir quando `request.areaApproval !== null` — clonar padrão do card `supervisorApproval` (linhas 238-269)

2. **Botão "Atender por Estoque"**: exibir na seção de cotações quando `status === 'pending_quotation'` E `user.role === 'buyer' | 'admin'`. Abre modal inline com campo `observation` opcional. Chama `confirmStock`.

3. **Seção "Histórico"**: card no final da página com lista de eventos em ordem cronológica. Cada item: ícone por tipo, nome + role do ator, data/hora, observação.

### Zod — schemas por formulário

Instalar `zod` (se não instalado) + `react-hook-form` (se não instalado).
Verificar primeiros.

| Arquivo | Schema | Campos validados |
|---|---|---|
| `requests/new/index.tsx` | `newRequestSchema` | title (min 3), description (min 10), quantity (> 0), unit (min 1), urgency (enum), justification (min 10) |
| `requests/detail/QuotationForm.tsx` | `quotationSchema` | supplier (min 2), price (> 0), deliveryDays (> 0, inteiro), observations (string) |
| `approvals/supervisor/ApprovalCard.tsx` | `supervisorApprovalSchema` | selectedQuotationId (required se approved=true), observation (min 5) |
| `approvals/financial/FinancialCard.tsx` | `financialApprovalSchema` | purchaseDate (required se approved=true, data válida), observation (min 5) |
| `approvals/area/AreaApprovalCard.tsx` | `areaApprovalSchema` | observation (min 5) |

### `components/Layout.tsx` — item de menu

Adicionar item "Aprovações de Área" no sidebar, visível apenas para `area_manager` e `admin`.
Seguir padrão dos outros itens de aprovação existentes.

---

## Error Handling Strategy

| Cenário | Tratamento | Impacto na UI |
|---|---|---|
| `areaApprove` em status errado | Guard retorna sem agir (silent) | Botão não aparece para status inválido |
| `confirmStock` em status errado | Guard retorna sem agir | Botão não aparece para status inválido |
| Solicitação legada sem `history[]` | `r.history ?? []` na leitura | Histórico aparece vazio — sem crash |
| Zod inválido | `react-hook-form` exibe erro inline | Submit bloqueado, foco no primeiro erro |

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---|---|---|
| Onde guardar `makeEvent` | Dentro do `DataProvider` (não exportado) | Função só faz sentido no contexto de escrita; não é lógica de domínio puro |
| `history[]` mutável via spread | `[...r.history, newEvent]` | Consistente com o padrão imutável já usado em `quotations` |
| Verificar react-hook-form antes de instalar | Sim, fazer grep primeiro | Pode já estar no projeto |
| Página de área vs modal | Página dedicada (`/aprovacoes/area`) | Consistente com supervisor e financial |
| `statusAfterStockConfirmation` no domínio | Sim, mesmo que trivial | Mantém todas as transições testáveis e no lugar certo |
