# Critérios de Aceite

Formato: **Given** (contexto) / **When** (ação) / **Then** (resultado esperado)

---

## Módulo: Login

### AC-LOGIN-01 — Login com credenciais válidas
- **Given** usuário com `active=true` cadastrado no sistema
- **When** informa email e senha corretos e confirma
- **Then** é redirecionado ao dashboard e a sessão é persistida no localStorage (`sc_current_user`)

### AC-LOGIN-02 — Bloqueio de credenciais inválidas
- **Given** qualquer usuário
- **When** informa email ou senha incorretos
- **Then** exibe mensagem de erro "Email ou senha inválidos." e permanece na tela de login

### AC-LOGIN-03 — Bloqueio de usuário inativo
- **Given** usuário com `active=false`
- **When** informa as credenciais corretas
- **Then** acesso é negado com mensagem de erro

### AC-LOGIN-04 — Persistência de sessão
- **Given** usuário autenticado
- **When** recarrega a página (F5)
- **Then** continua autenticado (sessão lida do localStorage)

---

## Módulo: Solicitações

### AC-REQ-01 — Criação de solicitação
- **Given** usuário autenticado com role `requester` ou `admin`
- **When** preenche todos os campos obrigatórios (título, descrição, quantidade, unidade, urgência, justificativa) e confirma
- **Then** solicitação criada com status `pending_quotation` aparece no topo da lista

### AC-REQ-02 — Visibilidade para solicitante
- **Given** usuário com role `requester` autenticado
- **When** acessa a lista de solicitações
- **Then** visualiza apenas as solicitações onde `requesterId === user.id`

### AC-REQ-03 — Visibilidade para outros perfis
- **Given** usuário com role diferente de `requester`
- **When** acessa a lista de solicitações
- **Then** visualiza todas as solicitações do sistema

### AC-REQ-04 — Filtro por status
- **Given** lista de solicitações com itens em diferentes status
- **When** seleciona um status no dropdown de filtro
- **Then** lista exibe apenas as solicitações com aquele status

### AC-REQ-05 — Filtro por texto
- **Given** lista de solicitações
- **When** digita texto no campo de busca
- **Then** lista filtra por título ou nome do solicitante (case-insensitive)

---

## Módulo: Cotações

### AC-QUOT-01 — Adição de cotação pelo comprador
- **Given** solicitação com status `pending_quotation` e menos de 3 cotações
- **When** comprador (ou admin) preenche fornecedor, preço, prazo e observação e confirma
- **Then** cotação aparece na lista e contador atualiza (ex: 1/3)

### AC-QUOT-02 — Avanço automático de status na 3ª cotação
- **Given** solicitação com 2 cotações e status `pending_quotation`
- **When** comprador adiciona a 3ª cotação
- **Then** status muda automaticamente para `pending_supervisor`

### AC-QUOT-03 — Remoção de cotação e reversão de status
- **Given** solicitação com 3 cotações e status `pending_supervisor`
- **When** comprador (ou admin) remove uma cotação
- **Then** status reverte para `pending_quotation` e contador cai para 2/3

### AC-QUOT-04 — Bloqueio de 4ª cotação
- **Given** solicitação com 3 cotações registradas
- **When** comprador tenta adicionar mais uma cotação
- **Then** botão "Adicionar" não está visível / ação não é permitida

### AC-QUOT-05 — Bloqueio por role
- **Given** usuário com role `requester`, `supervisor` ou `financial`
- **When** visualiza detalhe de uma solicitação
- **Then** botão de adicionar e remover cotação não estão presentes

---

## Módulo: Aprovação do Supervisor

### AC-SUP-01 — Aprovação com seleção de cotação
- **Given** solicitação com status `pending_supervisor` e 3 cotações
- **When** supervisor seleciona uma cotação vencedora, preenche observação e aprova
- **Then** status muda para `pending_financial`, campo `supervisorApproval` é preenchido com `approved=true`

### AC-SUP-02 — Reprovação com observação
- **Given** solicitação com status `pending_supervisor`
- **When** supervisor preenche observação e reprova
- **Then** status muda para `rejected`, campo `supervisorApproval` é preenchido com `approved=false`

### AC-SUP-03 — Fila exclusiva do supervisor
- **Given** usuário com role `supervisor` (ou admin)
- **When** acessa a tela de aprovação do supervisor
- **Then** visualiza apenas solicitações com status `pending_supervisor`

### AC-SUP-04 — Bloqueio por role
- **Given** usuário com role `requester`, `buyer` ou `financial`
- **When** tenta acessar a URL de aprovação do supervisor
- **Then** é redirecionado (ProtectedRoute bloqueia o acesso)

---

## Módulo: Aprovação Financeira

### AC-FIN-01 — Aprovação com data de compra
- **Given** solicitação com status `pending_financial`
- **When** financeiro informa data prevista de compra, preenche observação e aprova
- **Then** status muda para `approved`, campo `financialApproval` preenchido com `approved=true`

### AC-FIN-02 — Reprovação com observação
- **Given** solicitação com status `pending_financial`
- **When** financeiro preenche observação e reprova
- **Then** status muda para `rejected`, campo `financialApproval` preenchido com `approved=false`

### AC-FIN-03 — Fila exclusiva do financeiro
- **Given** usuário com role `financial` (ou admin)
- **When** acessa a tela de aprovação financeira
- **Then** visualiza apenas solicitações com status `pending_financial`

### AC-FIN-04 — Bloqueio por role
- **Given** usuário com role `requester`, `buyer` ou `supervisor`
- **When** tenta acessar a URL de aprovação financeira
- **Then** é redirecionado (ProtectedRoute bloqueia o acesso)

---

## Módulo: Gerenciamento de Usuários

### AC-USER-01 — Criação de usuário
- **Given** usuário autenticado com role `admin`
- **When** preenche nome, email, senha e role, e confirma
- **Then** novo usuário aparece na lista com `active=true`

### AC-USER-02 — Bloqueio de email duplicado
- **Given** email já cadastrado no sistema
- **When** admin tenta criar usuário com o mesmo email
- **Then** exibe mensagem de erro "Email já cadastrado." e usuário não é criado

### AC-USER-03 — Edição de usuário
- **Given** usuário admin na tela de usuários
- **When** edita nome, email ou role de um usuário e confirma
- **Then** as alterações são persistidas e refletidas na lista

### AC-USER-04 — Desativação (soft delete)
- **Given** usuário ativo no sistema
- **When** admin desativa o usuário
- **Then** `active` é alterado para `false`, usuário permanece no localStorage mas não consegue mais logar

### AC-USER-05 — Acesso restrito ao admin
- **Given** usuário com qualquer role diferente de `admin`
- **When** tenta acessar a tela de usuários (`/usuarios`)
- **Then** é redirecionado pelo ProtectedRoute

---

## Módulo: Dashboard

### AC-DASH-01 — Acesso universal
- **Given** qualquer usuário autenticado
- **When** acessa o dashboard
- **Then** visualiza os cards de estatísticas e gráficos de solicitações

### AC-DASH-02 — Filtro por período
- **Given** dashboard com solicitações em diferentes datas
- **When** altera o filtro de período (dia, semana, mês, ano)
- **Then** gráfico e contadores refletem apenas o período selecionado
