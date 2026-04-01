# Completude do Fluxo e Rastreabilidade — Especificação

**Status**: Aprovado
**Data**: 2026-04-01

---

## Problem Statement

O sistema tem tipos e regras de domínio definidos para os status `pending_area_approval` e
`fulfilled_by_stock`, mas esses status nunca são atingíveis na prática: as operações
`areaApprove` e `confirmStock` não existem no `DataContext`. Além disso, nenhuma solicitação
mantém um histórico cronológico de eventos — impossibilitando rastreabilidade e auditoria
completa, dois pilares centrais da visão do sistema.

---

## Goals

- [ ] Todo evento de negócio (criação, cotação, aprovação, rejeição, estoque) produz uma entrada auditável com ator e timestamp
- [ ] O fluxo `pending_area_approval → pending_quotation/rejected` é operável pelo `area_manager`
- [ ] O encerramento por estoque (`fulfilled_by_stock`) é operável pelo `buyer`
- [ ] Formulários de criação e cotação rejeitam dados inválidos com mensagens claras (Zod)
- [ ] A tela de detalhe exibe a linha do tempo completa da solicitação

---

## Out of Scope

| Feature | Razão |
|---------|-------|
| Notificações por email/push | Sem backend — Fase futura |
| Cancelamento pelo solicitante | Não solicitado nesta fase |
| Estado `draft` | Não solicitado nesta fase |
| Paginação do histórico | Volume baixo no MVP |
| Export PDF/CSV da auditoria | Fase futura |

---

## User Stories

### P1: Histórico de eventos (RAST) ⭐ MVP

**User Story**: Como qualquer usuário, quero ver a linha do tempo completa de uma solicitação
para entender o que aconteceu, quando e por quem, sem precisar deduzir a partir de campos
espalhados.

**Why P1**: É o pilar central de rastreabilidade — sem isso, a auditoria é impossível.

**Acceptance Criteria**:

1. WHEN uma solicitação é criada THEN system SHALL registrar evento `created` com `actorId`, `actorName`, `actorRole`, `timestamp`
2. WHEN uma cotação é adicionada THEN system SHALL registrar evento `quotation_added` com id da cotação e dados do ator
3. WHEN uma cotação é removida THEN system SHALL registrar evento `quotation_removed` com id da cotação e dados do ator
4. WHEN aprovação de área ocorre THEN system SHALL registrar evento `area_approved` ou `area_rejected`
5. WHEN aprovação do supervisor ocorre THEN system SHALL registrar evento `supervisor_approved` ou `supervisor_rejected`
6. WHEN aprovação financeira ocorre THEN system SHALL registrar evento `financial_approved` ou `financial_rejected`
7. WHEN encerramento por estoque ocorre THEN system SHALL registrar evento `fulfilled_by_stock`
8. WHEN usuário abre o detalhe de uma solicitação THEN system SHALL exibir todos os eventos em ordem cronológica crescente
9. WHEN o histórico é exibido THEN cada entrada SHALL mostrar: ícone do tipo de evento, nome do ator, role do ator, data/hora formatada, e observação (quando houver)

**Independent Test**: Criar solicitação → adicionar 3 cotações → aprovar como supervisor → verificar que o histórico mostra 5 entradas em ordem.

---

### P1: Aprovação de área completa (AREA) ⭐ MVP

**User Story**: Como `area_manager`, quero aprovar ou reprovar solicitações que chegam com
status `pending_area_approval` para que o fluxo prossiga para cotação ou seja encerrado.

**Why P1**: Sem isso, solicitações criadas por `requester` ficam presas para sempre em
`pending_area_approval` — o status existe no código mas nunca é processado.

**Acceptance Criteria**:

1. WHEN `area_manager` ou `admin` acessa a tela de aprovações de área THEN system SHALL listar todas as solicitações com status `pending_area_approval`
2. WHEN `area_manager` aprova uma solicitação THEN system SHALL mudar status para `pending_quotation` e registrar `areaApproval` com `approverId`, `approverName`, `approvedAt`, `observation`
3. WHEN `area_manager` reprova uma solicitação THEN system SHALL mudar status para `rejected` e registrar `areaApproval`
4. WHEN usuário com outro role acessa a tela de aprovações de área THEN system SHALL não exibir o item no menu de navegação
5. WHEN aprovação de área ocorre THEN system SHALL registrar evento `area_approved` ou `area_rejected` no `history[]`
6. WHEN detail da solicitação é aberto THEN system SHALL exibir o card de aprovação de área (se `areaApproval` não for null)

**Independent Test**: Login como `requester` → criar solicitação → login como `area_manager` → aprovar → verificar status `pending_quotation`.

---

### P1: Encerramento por estoque (STOCK) ⭐ MVP

**User Story**: Como `buyer`, quero informar que o item solicitado já está disponível em estoque
para encerrar o fluxo sem precisar passar por cotação e aprovações.

**Why P1**: O status `fulfilled_by_stock` existe nos tipos e no `STATUS_MAP` da UI, mas nunca
é atingível — é dead code que precisa ser conectado.

**Acceptance Criteria**:

1. WHEN solicitação está em `pending_quotation` E usuário é `buyer` ou `admin` THEN system SHALL exibir botão "Atender por Estoque" no detalhe
2. WHEN `buyer` confirma encerramento por estoque THEN system SHALL mudar status para `fulfilled_by_stock`, salvar `stockObservation` e setar `stockFulfilled = true`
3. WHEN encerramento por estoque ocorre THEN system SHALL registrar evento `fulfilled_by_stock` no `history[]`
4. WHEN solicitação está em `fulfilled_by_stock` THEN system SHALL exibir card informativo com observação e quem encerrou
5. WHEN solicitação está em `fulfilled_by_stock` THEN system SHALL não permitir adicionar cotações

**Independent Test**: Login como `buyer` → abrir solicitação em `pending_quotation` → clicar "Atender por Estoque" → verificar status e histórico.

---

### P2: Validação com Zod (VALID)

**User Story**: Como qualquer usuário preenchendo um formulário, quero receber erros claros
e imediatos ao submeter dados inválidos para não precisar descobrir o problema pelo
comportamento inesperado do sistema.

**Why P2**: Formulários aceitam qualquer input hoje. Dados corrompidos no localStorage são
difíceis de debugar. Mas o fluxo já funciona — é melhorias de qualidade, não bloqueador.

**Acceptance Criteria**:

1. WHEN "Nova Solicitação" é submetida com campos obrigatórios vazios THEN system SHALL exibir mensagens de erro inline por campo
2. WHEN "Nova Cotação" é submetida com `price <= 0` ou `deliveryDays <= 0` THEN system SHALL rejeitar com mensagem específica
3. WHEN aprovação de supervisor é submetida sem `selectedQuotationId` THEN system SHALL bloquear o submit
4. WHEN aprovação financeira é submetida sem `purchaseDate` THEN system SHALL bloquear o submit
5. WHEN aprovação de área é submetida sem `observation` THEN system SHALL bloquear o submit
6. WHEN todos os campos são válidos THEN system SHALL submeter normalmente sem interrupção

**Independent Test**: Submeter formulário de nova solicitação vazio → verificar que erros aparecem sem navegar.

---

## Edge Cases

- WHEN solicitação migrada do localStorage (sem `history[]`) é aberta THEN system SHALL exibir histórico vazio sem erro (campo opcional na leitura, array vazio como default)
- WHEN `area_manager` cria uma solicitação THEN system SHALL pular `pending_area_approval` (já implementado via `statusAfterCreation`) E o histórico SHALL refletir o status inicial correto
- WHEN `buyer` tenta atender por estoque em solicitação que não está em `pending_quotation` THEN system SHALL não exibir o botão
- WHEN Zod inválida um campo THEN o formulário SHALL focar no primeiro campo com erro

---

## Requirement Traceability

| Requirement ID | Story | Status |
|---|---|---|
| RAST-01 | P1: Histórico — tipo `AuditEvent` e campo `history[]` em `PurchaseRequest` | Pending |
| RAST-02 | P1: Histórico — `createRequest` registra evento `created` | Pending |
| RAST-03 | P1: Histórico — `addQuotation` registra evento `quotation_added` | Pending |
| RAST-04 | P1: Histórico — `removeQuotation` registra evento `quotation_removed` | Pending |
| RAST-05 | P1: Histórico — `areaApprove` registra evento `area_approved/rejected` | Pending |
| RAST-06 | P1: Histórico — `supervisorApprove` registra evento `supervisor_approved/rejected` | Pending |
| RAST-07 | P1: Histórico — `financialApprove` registra evento `financial_approved/rejected` | Pending |
| RAST-08 | P1: Histórico — `confirmStock` registra evento `fulfilled_by_stock` | Pending |
| RAST-09 | P1: UI — seção "Histórico" no detalhe da solicitação | Pending |
| AREA-01 | P1: Área — `areaApprove` no `DataContext` | Pending |
| AREA-02 | P1: Área — página `/aprovacoes/area` com lista e ação | Pending |
| AREA-03 | P1: Área — item no menu de navegação (visível só para `area_manager`/`admin`) | Pending |
| AREA-04 | P1: Área — card de `areaApproval` no detalhe | Pending |
| STOCK-01 | P1: Estoque — `confirmStock` no `DataContext` | Pending |
| STOCK-02 | P1: Estoque — botão "Atender por Estoque" no detalhe | Pending |
| STOCK-03 | P1: Estoque — card informativo quando `fulfilled_by_stock` no detalhe | Pending |
| VALID-01 | P2: Zod — schema + validação em `pages/requests/new` | Pending |
| VALID-02 | P2: Zod — schema + validação em `QuotationForm` | Pending |
| VALID-03 | P2: Zod — schema + validação em `ApprovalCard` (supervisor) | Pending |
| VALID-04 | P2: Zod — schema + validação em `FinancialCard` | Pending |
| VALID-05 | P2: Zod — schema + validação em formulário de aprovação de área | Pending |

---

## Success Criteria

- [ ] `npm test` continua verde — todos os testes existentes passando + novos testes para `history[]`
- [ ] `tsc --noEmit` → 0 erros
- [ ] Solicitação criada por `requester` percorre o fluxo completo (pending_area_approval → pending_quotation → pending_supervisor → pending_financial → approved) com histórico de 6+ eventos
- [ ] Solicitação encerrada por estoque percorre pending_quotation → fulfilled_by_stock com histórico correto
- [ ] Formulários rejeitam dados inválidos com erros inline
