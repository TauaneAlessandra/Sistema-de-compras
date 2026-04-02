# Ordem de Serviço (OS) — Tasks

**Spec**: `.specs/features/ordem-servico/spec.md`
**Design**: `.specs/features/ordem-servico/design.md`
**Status**: Aprovado
**Data**: 2026-04-01

---

## Execution Plan

```
Fase 1 — Tipos (Sequential, bloqueante)
  T01 → T02

Fase 2 — Infraestrutura (Sequential após T02)
  T02 → T03

Fase 3 — DataContext (Sequential após T03)
  T03 → T04

Fase 4 — Formulários e componente de documento (Parallel após T04)
  T04 ──┬─→ T05 [P]   (QuotationForm: supplierAddress)
        ├─→ T06 [P]   (FinancialCard: campos de pagamento + Zod)
        └─→ T07 [P]   (ServiceOrderDocument: componente de layout)

Fase 5 — Páginas (Sequential/Parallel após T07)
  T07 ──┬─→ T08 [P]   (página lista /ordens-servico)
        └─→ T09 [P]   (página detalhe /ordens-servico/:id com ações)

Fase 6 — Navegação (após T08)
  T08 → T10            (sidebar + rotas)

Fase 7 — PDF e compartilhamento (após T09)
  T09 → T11            (instalar libs + implementar PDF)
        T09 → T12 [P]  (print CSS)
        T09 → T13 [P]  (email + WhatsApp)

Fase 8 — Testes (após tudo)
  T14
```

---

## Task Breakdown

### T01: Adicionar `ServiceOrder` e `os_generated` em `types.ts`

**What**: Definir interface `ServiceOrder` com campos `id`, `number`, `requestId`, `generatedAt`, `generatedById`, `generatedByName`; adicionar `'os_generated'` à union `AuditEventType`
**Where**: `src/types.ts`
**Depends on**: Nenhuma
**Requirement**: OS-01, OS-02

**Done when**:
- [ ] Interface `ServiceOrder` exportada
- [ ] `'os_generated'` presente em `AuditEventType`
- [ ] `tsc --noEmit` → 0 erros

---

### T02: Adicionar novos campos em `Quotation` e `FinancialApproval` (types.ts)

**What**: Adicionar `supplierAddress?: string` em `Quotation`; adicionar `paymentMethod: string`, `paymentTerms: string`, `supplierBankInfo?: string` em `FinancialApproval`
**Where**: `src/types.ts`
**Depends on**: T01
**Requirement**: OS-05, OS-06

**Done when**:
- [ ] `Quotation.supplierAddress` opcional presente
- [ ] `FinancialApproval.paymentMethod`, `paymentTerms` obrigatórios presentes
- [ ] `FinancialApproval.supplierBankInfo` opcional presente
- [ ] `tsc --noEmit` → 0 erros (FinancialCard quebrará — corrigido em T06)

---

### T03: Criar `ServiceOrderRepository`

**What**: Implementar repositório com `getAll()`, `getById()`, `add()` e `nextNumber()` — counter sequencial em `localStorage` chave `sc_os_counter`, retorna string `OS-YYYY-NNN`
**Where**: `src/infrastructure/repositories/ServiceOrderRepository.ts`
**Depends on**: T01
**Reuses**: Padrão exato de `PurchaseRequestRepository.ts`
**Requirement**: OS-03

**Detalhes de `nextNumber()`**:
```typescript
// Lê número atual, incrementa, salva de volta, retorna formatado
const current = Number(localStorage.getItem('sc_os_counter') ?? '0') + 1
localStorage.setItem('sc_os_counter', String(current))
const year = new Date().getFullYear()
return `OS-${year}-${String(current).padStart(3, '0')}`
```

**Done when**:
- [ ] `getAll()` retorna array (default `[]`)
- [ ] `add()` persiste no localStorage
- [ ] `nextNumber()` retorna `OS-2026-001`, `OS-2026-002`, etc.
- [ ] `tsc --noEmit` → 0 erros

---

### T04: Atualizar `DataContext` — criar OS na aprovação financeira + expor métodos

**What**: (a) Modificar `financialApprove` para criar `ServiceOrder` quando `approved=true` e appendar evento `os_generated`; (b) adicionar `getServiceOrders` e `getServiceOrderById` à interface e implementação
**Where**: `src/context/DataContext.tsx`
**Depends on**: T01, T02, T03
**Requirement**: OS-04

**Detalhes**:
- Dentro do `financialApprove`, após salvar a aprovação:
  ```typescript
  if (data.approved) {
    const order: ServiceOrder = {
      id: crypto.randomUUID(),
      number: ServiceOrderRepository.nextNumber(),
      requestId,
      generatedAt: new Date().toISOString(),
      generatedById: user.id,
      generatedByName: user.name,
    }
    ServiceOrderRepository.add(order)
    // appender evento os_generated ao history da solicitação
  }
  ```
- Importar `ServiceOrderRepository` e `ServiceOrder`

**Done when**:
- [ ] Aprovação financeira com `approved=true` cria OS no localStorage
- [ ] Aprovação com `approved=false` não cria OS
- [ ] Evento `os_generated` aparece no `history[]` da solicitação
- [ ] `getServiceOrders()` e `getServiceOrderById()` funcionam
- [ ] `tsc --noEmit` → 0 erros
- [ ] `npm test` → todos passando

---

### T05: Adicionar `supplierAddress` em `QuotationForm` [P]

**What**: Adicionar campo de texto opcional `supplierAddress` ao final do grid do `QuotationForm`, incluir no `onSubmit` e no estado do form
**Where**: `src/pages/requests/detail/QuotationForm.tsx`
**Depends on**: T02
**Requirement**: OS-07

**Done when**:
- [ ] Campo visível no form com placeholder "Endereço/localização do fornecedor (opcional)"
- [ ] Valor incluído no objeto submetido via `onSubmit`
- [ ] Schema Zod atualizado (`supplierAddress: z.string()` opcional)
- [ ] `tsc --noEmit` → 0 erros

---

### T06: Adicionar campos de pagamento em `FinancialCard` + Zod atualizado [P]

**What**: Adicionar inputs `paymentMethod`, `paymentTerms`, `supplierBankInfo` ao form expandido do `FinancialCard`; atualizar schema Zod para exigir `paymentMethod` e `paymentTerms` ao aprovar
**Where**: `src/pages/approvals/financial/FinancialCard.tsx`
**Depends on**: T02
**Requirement**: OS-08

**Posição dos campos**: entre `purchaseDate` e `observation`

**Detalhes Zod**:
```typescript
// superRefine adicional:
if (data.approved && !data.paymentMethod.trim()) {
  ctx.addIssue({ ..., message: 'Forma de pagamento obrigatória.', path: ['paymentMethod'] })
}
if (data.approved && !data.paymentTerms.trim()) {
  ctx.addIssue({ ..., message: 'Prazo de pagamento obrigatório.', path: ['paymentTerms'] })
}
```

**Done when**:
- [ ] 3 novos campos presentes no form expandido
- [ ] `paymentMethod` e `paymentTerms` bloqueiam submit quando vazios ao aprovar
- [ ] `supplierBankInfo` é opcional
- [ ] `tsc --noEmit` → 0 erros

---

### T07: Criar `ServiceOrderDocument` [P]

**What**: Componente que recebe `{ order: ServiceOrder; request: PurchaseRequest }` e renderiza o layout completo da OS em 4 seções: cabeçalho, dados do item, fornecedor, pagamento
**Where**: `src/components/ServiceOrderDocument.tsx`
**Depends on**: T01, T02
**Reuses**: Padrão de cards de `pages/requests/detail/index.tsx`
**Requirement**: OS-10

**Seções**:
1. **Cabeçalho**: número OS em destaque, data/hora formatada `DD/MM/YYYY HH:mm`, "Gerado por: {nome}"
2. **Dados do item**: título, descrição, quantidade + unidade, urgência, justificativa
3. **Fornecedor**: nome, endereço (`supplierAddress ?? 'Não informado'`), valor, prazo de entrega
4. **Pagamento**: forma, prazo, dados bancários (seção oculta se `supplierBankInfo` vazio), observação financeira, data prevista de compra

**Done when**:
- [ ] Componente renderiza sem crash quando `supplierAddress` e `supplierBankInfo` são undefined
- [ ] Todas as 4 seções presentes
- [ ] `tsc --noEmit` → 0 erros

---

### T08: Criar página de lista `/ordens-servico` [P]

**What**: Página que lista todas as OS em ordem decrescente com número, título do item, data de geração e responsável
**Where**: `src/pages/orders/index.tsx`
**Depends on**: T04, T07
**Reuses**: Estrutura de `pages/requests/index.tsx`
**Requirement**: OS-09

**Done when**:
- [ ] Lista renderiza OS do `getServiceOrders()`
- [ ] Ordem decrescente por `generatedAt`
- [ ] Estado vazio com mensagem "Nenhuma ordem de serviço gerada"
- [ ] Cada item navega para `/ordens-servico/:id`
- [ ] `tsc --noEmit` → 0 erros

---

### T09: Criar página de detalhe `/ordens-servico/:id` [P]

**What**: Página que exibe `ServiceOrderDocument` completo com 4 botões de ação: Imprimir, Baixar PDF (placeholder até T11), Enviar por Email, Enviar por WhatsApp
**Where**: `src/pages/orders/detail/index.tsx`
**Depends on**: T04, T07
**Requirement**: OS-10

**Done when**:
- [ ] `ServiceOrderDocument` renderizado com dados corretos
- [ ] Botões de ação visíveis (Imprimir, PDF, Email, WhatsApp)
- [ ] Redirect para `/ordens-servico` se OS não encontrada
- [ ] `tsc --noEmit` → 0 erros

---

### T10: Adicionar rota e item no sidebar

**What**: Adicionar rota `/ordens-servico` e `/ordens-servico/:id` em `App.tsx`; adicionar item "Ordens de Serviço" no sidebar de `Layout.tsx` visível para todos os roles
**Where**: `src/App.tsx` + `src/components/Layout.tsx`
**Depends on**: T08, T09
**Requirement**: OS-11

**Done when**:
- [ ] Item "Ordens de Serviço" visível no sidebar para todos os roles
- [ ] Rotas funcionam (navegação de lista → detalhe)
- [ ] `tsc --noEmit` → 0 erros

---

### T11: Implementar botão "Baixar PDF"

**What**: Verificar/instalar `jspdf` e `html2canvas`; implementar função `handleDownloadPdf` na página de detalhe que captura `ServiceOrderDocument` via `html2canvas` e salva com `jspdf` como `{number}.pdf`
**Where**: `src/pages/orders/detail/index.tsx`
**Depends on**: T09
**Requirement**: OS-12

**Detalhes**:
```typescript
async function handleDownloadPdf() {
  const el = document.getElementById('service-order-document')
  if (!el) return
  const canvas = await html2canvas(el, { scale: 2 })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const width = pdf.internal.pageSize.getWidth()
  const height = (canvas.height * width) / canvas.width
  pdf.addImage(imgData, 'PNG', 0, 0, width, height)
  pdf.save(`${order.number}.pdf`)
}
```

**Done when**:
- [ ] Clique no botão gera e baixa arquivo `OS-2026-001.pdf`
- [ ] PDF contém conteúdo visual da OS
- [ ] `tsc --noEmit` → 0 erros

---

### T12: Implementar impressão com `@media print`

**What**: Adicionar `id="service-order-document"` ao `ServiceOrderDocument`; adicionar regras `@media print` em `index.css` que oculta todo o resto e exibe apenas o documento; implementar `window.print()` no botão Imprimir
**Where**: `src/index.css` + `src/pages/orders/detail/index.tsx`
**Depends on**: T09
**Requirement**: OS-13

**CSS**:
```css
@media print {
  body > #root > * { display: none !important; }
  #service-order-document { display: block !important; }
}
```

**Done when**:
- [ ] Clicar "Imprimir" abre diálogo de impressão do navegador
- [ ] Preview de impressão mostra apenas o documento, sem botões ou sidebar
- [ ] `tsc --noEmit` → 0 erros

---

### T13: Implementar Email e WhatsApp [P]

**What**: Implementar `handleShareEmail` (abre `mailto:` com assunto e corpo pré-formatados) e `handleShareWhatsApp` (abre `wa.me` com mensagem pré-formatada) na página de detalhe
**Where**: `src/pages/orders/detail/index.tsx`
**Depends on**: T09
**Requirement**: OS-14, OS-15

**Formato email**:
```
mailto:?subject=[OS-2026-001] Ordem de Serviço - {título}&body=ORDEM DE SERVIÇO...
```

**Formato WhatsApp**:
```
https://wa.me/?text=*OS-2026-001*%0A📦 Item: ...
```

**Done when**:
- [ ] Botão "Email" abre cliente de email com assunto e corpo corretos
- [ ] Botão "WhatsApp" abre WhatsApp com mensagem formatada com emoji
- [ ] Número OS, item, fornecedor, valor e data prevista presentes na mensagem
- [ ] `tsc --noEmit` → 0 erros

---

### T14: Testes — `ServiceOrderRepository.nextNumber()`

**What**: Adicionar testes em `workflow.test.ts` ou novo arquivo verificando que `nextNumber()` retorna formato `OS-YYYY-NNN` e que incrementa corretamente
**Where**: `src/domain/workflow.test.ts` ou `src/infrastructure/repositories/ServiceOrderRepository.test.ts`
**Depends on**: T03
**Requirement**: OS-03

**Done when**:
- [ ] Teste: `nextNumber()` retorna string no formato `OS-\d{4}-\d{3}`
- [ ] `npm test` → todos os testes passando
- [ ] `tsc --noEmit` → 0 erros

---

## Checklist de pacotes

Antes de T11, verificar:
- [ ] `jspdf` instalado? (`grep "jspdf" package.json`)
- [ ] `html2canvas` instalado? (`grep "html2canvas" package.json`)

Se não: `npm install jspdf html2canvas`

---

## Parallel Execution Map

```
Fase 1–3 (Sequential):
  T01 → T02 → T03 → T04

Fase 4 (Parallel após T04):
  T04 complete, então:
    ├── T05 [P]
    ├── T06 [P]
    └── T07 [P]

Fase 5 (Parallel após T07):
  T07 complete, então:
    ├── T08 [P]
    └── T09 [P]

Fase 6 (após T08):
  T08 → T10

Fase 7 (Parallel após T09):
  T09 complete, então:
    ├── T11
    ├── T12 [P]
    └── T13 [P]

Fase 8 (após T03):
  T03 → T14
```
