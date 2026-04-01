# Matriz de Permissões

## Perfis (roles)

| Role | Descrição |
|---|---|
| `admin` | Administrador — acesso total |
| `requester` | Solicitante — cria e acompanha suas próprias solicitações |
| `buyer` | Comprador — registra cotações |
| `supervisor` | Supervisor — aprova/reprova após cotações |
| `financial` | Financeiro — aprovação final |

---

## Autenticação e Sessão

| Ação | admin | requester | buyer | supervisor | financial |
|---|:---:|:---:|:---:|:---:|:---:|
| Fazer login | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fazer logout | ✅ | ✅ | ✅ | ✅ | ✅ |
| Acesso bloqueado se `active=false` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Solicitações de Compra

| Ação | admin | requester | buyer | supervisor | financial | Condição adicional |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Criar solicitação | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Listar todas as solicitações | ✅ | ❌ | ✅ | ✅ | ✅ | — |
| Listar apenas as próprias | ✅ | ✅ | ❌ | ❌ | ❌ | requester vê somente `requesterId === user.id` |
| Ver detalhe de qualquer solicitação | ✅ | ❌ | ✅ | ✅ | ✅ | — |
| Ver detalhe das próprias solicitações | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Alterar solicitação após criação | ❌ | ❌ | ❌ | ❌ | ❌ | Não implementado no MVP |

---

## Cotações

| Ação | admin | requester | buyer | supervisor | financial | Condição adicional |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Adicionar cotação | ✅ | ❌ | ✅ | ❌ | ❌ | Somente quando status = `pending_quotation` e < 3 cotações |
| Remover cotação | ✅ | ❌ | ✅ | ❌ | ❌ | Somente quando status = `pending_quotation` |
| Visualizar cotações | ✅ | ✅ | ✅ | ✅ | ✅ | — |

---

## Aprovação do Supervisor

| Ação | admin | requester | buyer | supervisor | financial | Condição adicional |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Ver fila de aprovação supervisor | ✅ | ❌ | ❌ | ✅ | ❌ | — |
| Aprovar solicitação | ✅ | ❌ | ❌ | ✅ | ❌ | Somente quando status = `pending_supervisor` |
| Reprovar solicitação | ✅ | ❌ | ❌ | ✅ | ❌ | Somente quando status = `pending_supervisor` |

---

## Aprovação Financeira

| Ação | admin | requester | buyer | supervisor | financial | Condição adicional |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Ver fila de aprovação financeira | ✅ | ❌ | ❌ | ❌ | ✅ | — |
| Aprovar solicitação | ✅ | ❌ | ❌ | ❌ | ✅ | Somente quando status = `pending_financial` |
| Reprovar solicitação | ✅ | ❌ | ❌ | ❌ | ✅ | Somente quando status = `pending_financial` |

---

## Gerenciamento de Usuários

| Ação | admin | requester | buyer | supervisor | financial | Observação |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Listar usuários | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Criar usuário | ✅ | ❌ | ❌ | ❌ | ❌ | Email deve ser único |
| Editar usuário | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Desativar usuário | ✅ | ❌ | ❌ | ❌ | ❌ | Soft delete — não remove histórico |
| Reativar usuário | ✅ | ❌ | ❌ | ❌ | ❌ | — |

---

## Dashboard

| Ação | admin | requester | buyer | supervisor | financial |
|---|:---:|:---:|:---:|:---:|:---:|
| Visualizar dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Nota**: O dashboard exibe métricas globais para todos os perfis, sem filtragem por solicitante.

---

## Navegação (sidebar)

| Item de menu | admin | requester | buyer | supervisor | financial |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Solicitações | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nova Solicitação | ✅ | ✅ | ❌ | ❌ | ❌ |
| Aprovação Supervisor | ✅ | ❌ | ❌ | ✅ | ❌ |
| Aprovação Financeiro | ✅ | ❌ | ❌ | ❌ | ✅ |
| Usuários | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Regras gerais

1. Usuário com `active=false` não consegue autenticar — independente de role
2. O `admin` bypassa todas as restrições de role, mas não as restrições de status
3. Restrições de status (ex: só aprovar em `pending_supervisor`) aplicam-se a todos, incluindo admin
4. O sistema não implementa RBAC granular por linha: a autorização é baseada em role + status da solicitação
