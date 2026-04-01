# Especificação do Fluxo de Domínio

## Estados possíveis de uma Solicitação

| Status | Descrição |
|---|---|
| `pending_quotation` | Aguardando cotações do comprador |
| `pending_supervisor` | Cotações completas, aguardando decisão do supervisor |
| `pending_financial` | Supervisor aprovou, aguardando decisão do financeiro |
| `approved` | Aprovada pelo financeiro — fluxo encerrado com sucesso |
| `rejected` | Reprovada (pelo supervisor ou pelo financeiro) — fluxo encerrado |

> Não existe estado `draft`. A solicitação nasce diretamente como `pending_quotation`.

---

## Diagrama de Transições

```
[CRIAÇÃO]
    ↓
pending_quotation
    │
    ├── addQuotation → quotations.length < 3  → pending_quotation (sem mudança)
    ├── addQuotation → quotations.length >= 3 → pending_supervisor
    └── removeQuotation → quotations.length < 3 → pending_quotation (reversão)

pending_supervisor
    ├── supervisorApprove(approved=true)  → pending_financial
    └── supervisorApprove(approved=false) → rejected

pending_financial
    ├── financialApprove(approved=true)  → approved
    └── financialApprove(approved=false) → rejected
```

---

## Transições Detalhadas

### T1 — Criação da solicitação

- **De:** (nenhum estado anterior)
- **Para:** `pending_quotation`
- **Ator:** Solicitante ou Admin
- **Pré-condições:** usuário autenticado com role `requester` ou `admin`
- **Campos obrigatórios:** `title`, `description`, `quantity`, `unit`, `urgency`, `justification`
- **Pós-condições:** solicitação criada com `quotations: []`, `supervisorApproval: null`, `financialApproval: null`
- **Casos inválidos:** usuário com role `buyer`, `supervisor` ou `financial` não pode criar

---

### T2 — Adição de cotação (avanço automático)

- **De:** `pending_quotation`
- **Para:** `pending_quotation` (se < 3 cotações) ou `pending_supervisor` (se >= 3 cotações)
- **Ator:** Comprador ou Admin
- **Pré-condições:**
  - solicitação com status `pending_quotation`
  - máximo de 2 cotações já registradas (para que seja possível adicionar mais)
- **Campos obrigatórios da cotação:** `supplier`, `price`, `deliveryDays`, `observations`
- **Pós-condições:** cotação adicionada; se total >= 3, status avança automaticamente
- **Casos inválidos:**
  - adicionar cotação em solicitação com status diferente de `pending_quotation`
  - adicionar uma 4ª cotação (já existem 3)
  - role `requester`, `supervisor` ou `financial` tentando adicionar cotação

---

### T3 — Remoção de cotação (reversão automática)

- **De:** `pending_quotation` (ou `pending_supervisor` se a remoção reduzir abaixo de 3)
- **Para:** `pending_quotation`
- **Ator:** Comprador ou Admin
- **Pré-condições:** cotação existe na solicitação
- **Pós-condições:** cotação removida; se total < 3, status reverte para `pending_quotation`
- **Casos inválidos:**
  - remover cotação de solicitação em `pending_financial`, `approved` ou `rejected`
  - role sem permissão tentando remover

---

### T4 — Aprovação pelo supervisor

- **De:** `pending_supervisor`
- **Para:** `pending_financial` (approved=true) ou `rejected` (approved=false)
- **Ator:** Supervisor ou Admin
- **Pré-condições:** status obrigatoriamente `pending_supervisor`
- **Campos obrigatórios ao aprovar:** `selectedQuotationId`, `observation`
- **Campos obrigatórios ao reprovar:** `observation`
- **Pós-condições:** `supervisorApproval` preenchido; status atualizado
- **Casos inválidos:**
  - agir sobre solicitação fora de `pending_supervisor`
  - aprovar sem selecionar uma cotação
  - role sem permissão tentando aprovar

---

### T5 — Aprovação pelo financeiro

- **De:** `pending_financial`
- **Para:** `approved` (approved=true) ou `rejected` (approved=false)
- **Ator:** Financeiro ou Admin
- **Pré-condições:** status obrigatoriamente `pending_financial`
- **Campos obrigatórios ao aprovar:** `purchaseDate`, `observation`
- **Campos obrigatórios ao reprovar:** `observation`
- **Pós-condições:** `financialApproval` preenchido; status atualizado
- **Casos inválidos:**
  - agir sobre solicitação fora de `pending_financial`
  - aprovar sem informar data prevista de compra
  - role sem permissão tentando aprovar

---

## Regras implícitas de estado

- `approved` e `rejected` são **estados terminais** — sem transição possível a partir deles
- `supervisorApproval` só é populado durante T4
- `financialApproval` só é populado durante T5
- A remoção de cotações pode reverter `pending_supervisor` → `pending_quotation` (T3)
- O campo `selectedQuotationId` em `supervisorApproval` deve referenciar um ID presente em `quotations`

---

## Estados não implementados nesta fase

- `draft` — rascunho antes de submeter
- `cancelled` — cancelamento pelo solicitante
- `on_hold` — suspensão temporária
