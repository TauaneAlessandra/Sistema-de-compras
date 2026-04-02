# Ordem de Serviço (OS) — Design

**Spec**: `.specs/features/ordem-servico/spec.md`
**Status**: Aprovado
**Data**: 2026-04-01

---

## Architecture Overview

Nenhuma nova camada. A OS é uma entidade de primeira classe persistida no localStorage,
gerada como efeito colateral da aprovação financeira.

```
types.ts              ← ServiceOrder, AuditEventType += 'os_generated'
                        Quotation += supplierAddress
                        FinancialApproval += paymentMethod, paymentTerms, supplierBankInfo

infrastructure/
  ServiceOrderRepository   ← getAll, getById, add, nextNumber (counter sequencial)

DataContext              ← financialApprove cria OS + registra evento
                           expõe getServiceOrders, getServiceOrderById

pages/
  orders/index.tsx         ← lista de OS (nova página)
  orders/[id]/index.tsx    ← detalhe da OS com PDF/print/email/WhatsApp

components/
  ServiceOrderDocument.tsx ← layout do documento (usado no detalhe + referenciado no PDF)

pages/approvals/financial/FinancialCard.tsx  ← novos campos de pagamento
pages/requests/detail/QuotationForm.tsx      ← novo campo supplierAddress

App.tsx / Layout.tsx     ← nova rota + item no sidebar
```

---

## Code Reuse Analysis

| Existente | Localização | Como reutilizar |
|---|---|---|
| `PurchaseRequestRepository` | `infrastructure/repositories/` | Clonar padrão para `ServiceOrderRepository` |
| `makeEvent` no DataContext | `context/DataContext.tsx` | Reutilizar — já suporta `os_generated` após adicionar ao tipo |
| `FinancialCard` aprovação | `pages/approvals/financial/FinancialCard.tsx` | Adicionar campos novos ao form existente |
| `QuotationForm` | `pages/requests/detail/QuotationForm.tsx` | Adicionar campo `supplierAddress` |
| Layout sidebar pattern | `components/Layout.tsx` | Adicionar item "Ordens de Serviço" |
| Card pattern do detalhe | `pages/requests/detail/index.tsx` | Clonar estrutura de cards para `ServiceOrderDocument` |

---

## Data Models

### `ServiceOrder` (novo tipo em `types.ts`)

```typescript
export interface ServiceOrder {
  id: string
  number: string           // "OS-2026-001"
  requestId: string        // PurchaseRequest.id
  generatedAt: string      // ISO 8601
  generatedById: string    // SafeUser.id do financeiro
  generatedByName: string
}
```

A OS não duplica os dados da solicitação — apenas referencia via `requestId`.
Na UI, busca-se a `PurchaseRequest` pelo `requestId` para montar o documento completo.

### `AuditEventType` — novo valor

```typescript
| 'os_generated'   // adicionado à union existente
```

### `Quotation` — novo campo

```typescript
supplierAddress?: string  // endereço/localização do fornecedor (opcional)
```

### `FinancialApproval` — novos campos

```typescript
paymentMethod: string      // "Boleto", "Transferência bancária", "Cartão", etc.
paymentTerms: string       // "À vista", "30 dias", "60 dias", etc.
supplierBankInfo?: string  // dados bancários livres (banco, agência, conta)
```

---

## Components

### `ServiceOrderRepository` (novo)

- **Purpose**: Persistir e recuperar OS no localStorage; gerar número sequencial
- **Location**: `src/infrastructure/repositories/ServiceOrderRepository.ts`
- **Interfaces**:
  - `getAll(): ServiceOrder[]`
  - `getById(id: string): ServiceOrder | null`
  - `add(order: ServiceOrder): void`
  - `nextNumber(): string` — lê contador `sc_os_counter`, incrementa, retorna `OS-YYYY-NNN`
- **Reuses**: Padrão exato de `PurchaseRequestRepository`

### `DataContext` — 2 adições

**`financialApprove` (modificação)**
- Quando `data.approved === true`: após salvar a aprovação, cria `ServiceOrder` via `ServiceOrderRepository.add()` e appenda `makeEvent('os_generated', user)` ao histórico

**Novos métodos expostos na interface `DataContextValue`**:
- `getServiceOrders(): ServiceOrder[]`
- `getServiceOrderById(id: string): ServiceOrder | null`

### `ServiceOrderDocument` (novo componente)

- **Purpose**: Layout visual do documento OS — renderizado na tela e referenciado para impressão/PDF
- **Location**: `src/components/ServiceOrderDocument.tsx`
- **Props**: `{ order: ServiceOrder; request: PurchaseRequest }`
- **Seções**:
  1. Cabeçalho: número OS, data/hora geração (`DD/MM/YYYY HH:mm`), responsável
  2. Dados do item: título, descrição, quantidade, unidade, urgência, justificativa
  3. Fornecedor selecionado: nome, preço, prazo entrega, endereço
  4. Pagamento: forma, prazo, dados bancários (se preenchido), observação financeira, data prevista de compra
- **Reuses**: Padrão de cards do `detail/index.tsx`

### `pages/orders/index.tsx` (nova página)

- **Purpose**: Listar todas as OS em ordem decrescente
- **Location**: `src/pages/orders/index.tsx`
- **Reuses**: Estrutura de `pages/requests/index.tsx`
- Cada linha: número OS, título do item (via `requestId`), data de geração, responsável, link para detalhe

### `pages/orders/detail/index.tsx` (nova página)

- **Purpose**: Exibir documento completo da OS com ações de compartilhamento
- **Location**: `src/pages/orders/detail/index.tsx`
- **Ações**:
  - **Imprimir**: `window.print()` — CSS `@media print` oculta tudo exceto `ServiceOrderDocument`
  - **PDF**: `html2canvas` captura `ServiceOrderDocument` → `jspdf` salva como `OS-YYYY-NNN.pdf`
  - **Email**: `window.location.href = 'mailto:?subject=...&body=...'`
  - **WhatsApp**: `window.open('https://wa.me/?text=...')`

### `FinancialCard.tsx` (modificação)

Adicionar 3 campos ao form expandido, entre `purchaseDate` e `observation`:
- `paymentMethod`: `<input type="text">` com placeholder "Ex: Boleto, Transferência, Cartão"
- `paymentTerms`: `<input type="text">` com placeholder "Ex: À vista, 30 dias"
- `supplierBankInfo`: `<textarea>` com placeholder "Banco, agência, conta (opcional)"

Zod atualizado: `paymentMethod` e `paymentTerms` obrigatórios ao aprovar.

### `QuotationForm.tsx` (modificação)

Adicionar campo opcional `supplierAddress` ao final do grid:
- `<input type="text">` placeholder "Endereço/localização do fornecedor (opcional)"

---

## PDF — Decisão técnica

| Opção | Prós | Contras |
|---|---|---|
| `jspdf` + `html2canvas` | Captura o layout exato da tela | Dependência pesada (~400kb) |
| CSS `@media print` + "Salvar como PDF" | Zero dependência, layout idêntico | Usuário precisa escolher "Salvar como PDF" no diálogo |
| `react-to-print` | Simples, leve | Só imprime, não baixa PDF automaticamente |

**Decisão**: `jspdf` + `html2canvas` para o botão "Baixar PDF" (experiência completa) + `window.print()` separado para "Imprimir". Verificar se já instalados antes de instalar.

---

## Email — Formato do corpo

```
Assunto: [OS-2026-001] Ordem de Serviço - Papel A4

Corpo:
ORDEM DE SERVIÇO - OS-2026-001
Gerada em: 01/04/2026 15:30
Responsável: Maria Silva

ITEM
Título: Papel A4
Quantidade: 10 cx
Urgência: Média
Justificativa: Estoque zerado

FORNECEDOR
Nome: Distribuidora XYZ
Endereço: Rua das Flores, 100
Valor: R$ 450,00
Prazo de entrega: 5 dias

PAGAMENTO
Forma: Boleto
Prazo: 30 dias
Data prevista de compra: 10/04/2026
```

---

## WhatsApp — Formato da mensagem

```
*OS-2026-001 — Ordem de Serviço*

📦 Item: Papel A4 (10 cx)
🏪 Fornecedor: Distribuidora XYZ
💰 Valor: R$ 450,00
📅 Compra prevista: 10/04/2026
💳 Pagamento: Boleto — 30 dias

Gerada em 01/04/2026 às 15:30 por Maria Silva
```

---

## CSS `@media print`

Adicionar no `index.css`:
```css
@media print {
  body > * { display: none !important; }
  #service-order-print { display: block !important; }
}
```

`ServiceOrderDocument` recebe `id="service-order-print"` quando dentro da página de detalhe.

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---|---|---|
| OS não duplica dados | Referência via `requestId` | Evita inconsistência: se os dados da solicitação mudarem, OS reflete o estado atual |
| Counter sequencial | localStorage `sc_os_counter` | Sem backend; aceita gap no número se localStorage for limpo |
| Campos de pagamento | Texto livre | Flexível — não precisa de select com opções fixas |
| `supplierAddress` opcional | Sim | Comprador pode não ter o endereço no momento |
| PDF via `html2canvas` | Captura DOM | Garante que o PDF seja idêntico ao que está na tela |
