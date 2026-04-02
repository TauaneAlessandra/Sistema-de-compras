# Ordem de Serviço (OS) — Especificação

**Status**: Aprovado
**Data**: 2026-04-01

---

## Problem Statement

Após a aprovação financeira de uma solicitação de compra, o sistema não produz nenhum
documento formal que registre a compra autorizada. Compradores, solicitantes e gestores
não têm como consultar, imprimir ou compartilhar os dados da compra aprovada de forma
padronizada. A OS preenche essa lacuna: é o documento oficial gerado automaticamente ao
final do fluxo, contendo todos os dados necessários para executar e rastrear a compra.

---

## Goals

- [ ] Toda solicitação aprovada financeiramente gera automaticamente uma OS numerada
- [ ] A OS consolida em um único lugar todos os dados da compra (item, fornecedor, pagamento)
- [ ] Qualquer usuário autenticado pode consultar e compartilhar a OS
- [ ] A OS pode ser exportada em PDF, impressa, e compartilhada via email e WhatsApp

---

## Out of Scope

| Feature | Razão |
|---|---|
| Envio automático de email/WhatsApp | Sem backend — abre o app do usuário |
| Imagem do item na OS | Decisão do usuário |
| Cancelamento ou edição da OS | OS é imutável após gerada |
| Assinatura digital | Sem backend |
| Integração com ERP/sistema financeiro | Fase futura |

---

## User Stories

### P1: Geração automática da OS ⭐ MVP

**User Story**: Como sistema, quero gerar automaticamente uma OS numerada quando o
financeiro aprova uma solicitação, para que a compra tenha um documento oficial rastreável.

**Why P1**: Sem a OS, o fluxo de aprovação não produz nenhum artefato formal. É o
documento que fecha o ciclo.

**Acceptance Criteria**:

1. WHEN financeiro aprova uma solicitação (`approved=true`) THEN system SHALL criar uma `ServiceOrder` com número sequencial no formato `OS-YYYY-NNN`
2. WHEN a OS é criada THEN system SHALL vincular o ID da solicitação à OS
3. WHEN a OS é criada THEN system SHALL registrar evento `os_generated` no `history[]` da solicitação
4. WHEN a OS é criada THEN system SHALL persistir no localStorage via `ServiceOrderRepository`
5. WHEN financeiro reprova (`approved=false`) THEN system SHALL NOT criar OS

**Independent Test**: Aprovar financeiramente uma solicitação → verificar que OS aparece na lista com número `OS-2026-001`.

---

### P1: Campos de pagamento e localização no fluxo ⭐ MVP

**User Story**: Como financeiro, quero preencher forma de pagamento, prazo e dados
bancários ao aprovar, e como comprador quero informar o endereço do fornecedor ao
registrar a cotação, para que a OS contenha todas as informações de execução da compra.

**Why P1**: A OS só é útil se tiver os dados de pagamento e localização. Sem esses campos
não existe documento completo.

**Acceptance Criteria**:

1. WHEN comprador adiciona uma cotação THEN form SHALL incluir campo `supplierAddress` (endereço/localização do fornecedor, opcional)
2. WHEN financeiro aprova uma solicitação THEN form SHALL incluir campos obrigatórios: `paymentMethod` (forma de pagamento), `paymentTerms` (prazo)
3. WHEN financeiro aprova THEN form SHALL incluir campo opcional `supplierBankInfo` (dados bancários do fornecedor)
4. WHEN FinancialApproval é salvo THEN system SHALL persistir os novos campos junto com os existentes
5. WHEN Zod valida o form de aprovação financeira THEN `paymentMethod` e `paymentTerms` SHALL ser obrigatórios ao aprovar

**Independent Test**: Aprovar financeiramente preenchendo os novos campos → abrir a OS gerada → verificar que campos aparecem.

---

### P1: Consulta da OS ⭐ MVP

**User Story**: Como qualquer usuário autenticado, quero ver a lista de ordens de serviço
e o detalhe de cada uma, para acompanhar as compras autorizadas.

**Why P1**: Se a OS não for visível, não serve como documento de rastreamento.

**Acceptance Criteria**:

1. WHEN usuário acessa `/ordens-servico` THEN system SHALL listar todas as OS em ordem decrescente de criação
2. WHEN lista está vazia THEN system SHALL exibir estado vazio informativo
3. WHEN usuário clica em uma OS THEN system SHALL exibir o detalhe completo com todos os campos
4. WHEN OS é exibida THEN system SHALL mostrar: número OS, data/hora de geração, responsável (financeiro), dados do item, fornecedor selecionado, endereço do fornecedor, forma de pagamento, prazo, dados bancários, observação financeira, data prevista de compra

**Independent Test**: Gerar OS → acessar `/ordens-servico` → clicar na OS → verificar todos os campos.

---

### P1: PDF e Impressão ⭐ MVP

**User Story**: Como qualquer usuário, quero exportar a OS em PDF ou imprimir, para ter
o documento físico ou digital da compra autorizada.

**Why P1**: Sem exportação, a OS não serve como documento formal.

**Acceptance Criteria**:

1. WHEN usuário clica "Baixar PDF" THEN system SHALL gerar um arquivo PDF com os dados da OS
2. WHEN usuário clica "Imprimir" THEN system SHALL abrir o diálogo de impressão do navegador com layout otimizado para impressão
3. WHEN PDF é gerado THEN system SHALL incluir o número da OS no nome do arquivo (ex: `OS-2026-001.pdf`)
4. WHEN layout de impressão é renderizado THEN system SHALL ocultar botões e navegação (apenas conteúdo da OS)

**Independent Test**: Clicar "Baixar PDF" → verificar que arquivo `OS-2026-001.pdf` é baixado com conteúdo correto.

---

### P1: Compartilhamento via Email e WhatsApp ⭐ MVP

**User Story**: Como qualquer usuário, quero compartilhar os dados da OS via email ou
WhatsApp para comunicar a compra autorizada sem precisar copiar manualmente.

**Why P1**: Compartilhamento é requisito explícito do sistema.

**Acceptance Criteria**:

1. WHEN usuário clica "Enviar por Email" THEN system SHALL abrir o cliente de email do usuário (`mailto:`) com assunto e corpo pré-preenchidos com os dados da OS
2. WHEN usuário clica "Enviar por WhatsApp" THEN system SHALL abrir WhatsApp Web/App (`https://wa.me/`) com mensagem de texto pré-formatada com os dados da OS
3. WHEN email é pré-preenchido THEN assunto SHALL ser `[OS-YYYY-NNN] Ordem de Serviço - {título do item}`
4. WHEN mensagem WhatsApp é pré-formatada THEN SHALL incluir: número OS, item, fornecedor, valor, data prevista de compra

**Independent Test**: Clicar "WhatsApp" → verificar que WhatsApp abre com mensagem contendo número OS e dados principais.

---

## Edge Cases

- WHEN duas solicitações são aprovadas simultaneamente THEN cada uma SHALL receber número OS diferente (counter sequencial no localStorage)
- WHEN OS existe mas a solicitação vinculada foi corrompida THEN system SHALL exibir OS com os dados que possui, sem crash
- WHEN `supplierAddress` não foi preenchido na cotação THEN OS SHALL exibir "Não informado"
- WHEN `supplierBankInfo` não foi preenchido THEN OS SHALL omitir a seção
- WHEN usuário tenta acessar `/ordens-servico/:id` com ID inválido THEN system SHALL exibir "OS não encontrada"

---

## Novos campos no modelo de dados

### Em `Quotation` (novo campo)
```
supplierAddress?: string   // endereço/localização do fornecedor
```

### Em `FinancialApproval` (novos campos)
```
paymentMethod: string      // forma de pagamento (boleto, transferência, cartão...)
paymentTerms: string       // prazo (à vista, 30 dias, 60 dias...)
supplierBankInfo?: string  // dados bancários do fornecedor
```

### Nova entidade `ServiceOrder`
```
id: string
number: string             // OS-2026-001
requestId: string          // referência à PurchaseRequest
generatedAt: string        // ISO 8601
generatedBy: string        // ID do financeiro
generatedByName: string
```

---

## Requirement Traceability

| Requirement ID | Story | Status |
|---|---|---|
| OS-01 | P1: Geração — tipo `ServiceOrder` em `types.ts` | Pending |
| OS-02 | P1: Geração — `AuditEventType` inclui `os_generated` | Pending |
| OS-03 | P1: Geração — `ServiceOrderRepository` (localStorage, counter sequencial) | Pending |
| OS-04 | P1: Geração — `financialApprove` cria OS e registra evento no histórico | Pending |
| OS-05 | P1: Campos — `supplierAddress` em `Quotation` | Pending |
| OS-06 | P1: Campos — `paymentMethod`, `paymentTerms`, `supplierBankInfo` em `FinancialApproval` | Pending |
| OS-07 | P1: Campos — `QuotationForm` com campo `supplierAddress` | Pending |
| OS-08 | P1: Campos — `FinancialCard` com campos de pagamento (Zod atualizado) | Pending |
| OS-09 | P1: Consulta — página `/ordens-servico` com lista | Pending |
| OS-10 | P1: Consulta — página `/ordens-servico/:id` com detalhe completo | Pending |
| OS-11 | P1: Consulta — item no sidebar + rotas em `App.tsx` | Pending |
| OS-12 | P1: PDF — botão "Baixar PDF" com `jspdf` + `html2canvas` | Pending |
| OS-13 | P1: Impressão — botão "Imprimir" com `window.print()` + CSS `@media print` | Pending |
| OS-14 | P1: Email — botão "Enviar por Email" com `mailto:` pré-preenchido | Pending |
| OS-15 | P1: WhatsApp — botão "Enviar por WhatsApp" com `wa.me` pré-formatado | Pending |

---

## Success Criteria

- [ ] Aprovar financeiramente → OS gerada automaticamente com número sequencial
- [ ] OS visível na lista `/ordens-servico` para todos os usuários
- [ ] PDF baixado com nome `OS-YYYY-NNN.pdf`
- [ ] Botão WhatsApp abre app com dados pré-preenchidos
- [ ] `tsc --noEmit` → 0 erros
- [ ] `npm test` → todos os testes passando
