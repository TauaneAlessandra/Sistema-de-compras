# Estado Atual do Projeto

**Atualizado em:** 2026-04-01

---

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| UI | React | 19.2.4 |
| Tipagem | TypeScript | 6.0.2 (strict) |
| Build | Vite | 8.0.1 |
| Roteamento | React Router DOM | 7.13.2 |
| CSS | Tailwind CSS | 3.4.19 |
| Gráficos | Recharts | 3.8.1 |
| Ícones | lucide-react | 1.7.0 |
| Crop de imagem | react-easy-crop | 5.5.7 |
| Testes | Vitest | 4.1.2 |
| Lint | ESLint 9 + typescript-eslint | — |
| Persistência | localStorage | — |

---

## Módulos implementados

| Módulo | Arquivos | Status |
|---|---|---|
| Login | `pages/login/index.tsx` | Funcional |
| Dashboard | `pages/dashboard/` | Funcional |
| Lista de Solicitações | `pages/requests/index.tsx` | Funcional |
| Nova Solicitação | `pages/requests/new/` | Funcional |
| Detalhe + Cotações | `pages/requests/detail/` | Funcional |
| Aprovação Supervisor | `pages/approvals/supervisor/` | Funcional |
| Aprovação Financeiro | `pages/approvals/financial/` | Funcional |
| Gerenciamento Usuários | `pages/users/` | Funcional |
| Contexto de Auth | `context/AuthContext.tsx` | Funcional |
| Contexto de Dados | `context/DataContext.tsx` | Funcional |
| Domínio (regras) | `domain/workflow.ts` | Extraído (TASK-008) |
| Repositório Solicitações | `infrastructure/repositories/PurchaseRequestRepository.ts` | Implementado (TASK-009) |
| Repositório Auth | `infrastructure/repositories/AuthRepository.ts` | Implementado (TASK-010) |
| Testes de domínio | `domain/workflow.test.ts` | 29 testes passando (TASK-012/013) |

---

## Regras de negócio implementadas

- Solicitação nasce como `pending_quotation`
- Ao adicionar 3ª cotação → status avança para `pending_supervisor`
- Ao remover cotação e cair abaixo de 3 → status reverte para `pending_quotation`
- Supervisor aprova → `pending_financial`; reprova → `rejected`
- Financeiro aprova → `approved`; reprova → `rejected`
- Solicitante vê apenas as próprias solicitações
- Usuário inativo não consegue autenticar
- Exclusão de usuário é soft delete (`active=false`)
- Email de usuário deve ser único

---

## Gaps conhecidos

| Gap | Impacto | Fase planejada |
|---|---|---|
| Regras de status ainda no DataContext além do domínio | Duplicação conceitual | Fase 3 (TASK-008 parcialmente resolveu) |
| Contextos acessam `localStorage` via repositório, mas ainda têm lógica de negócio inline | Médio | Fase 3+ |
| Sem validação de schema (zod ou similar) nos formulários | Médio | Fase 3 |
| `exhaustive-deps` warnings em 5 useEffect | Baixo | Fase 3 (TASK-008-010) |
| Nenhum teste de integração ou de componente | Médio | Fase 4 |
| Sem tratamento de erro para dados corrompidos no localStorage | Baixo | Fase 2+ |
| `@types/react-router-dom` v5 instalado junto com react-router-dom v7 | Baixo | Corrigir na baseline |

---

## Estrutura de arquivos relevantes

```
src/
├── vite-env.d.ts
├── types.ts
├── App.tsx
├── main.tsx
├── components/
│   ├── Layout.tsx          (SidebarContent extraído para fora do render)
│   ├── ProtectedRoute.tsx
│   └── ImageCropper.tsx
├── context/
│   ├── AuthContext.tsx     (usa AuthRepository)
│   └── DataContext.tsx     (usa PurchaseRequestRepository + domain/workflow)
├── domain/
│   ├── workflow.ts         (regras puras de transição e permissão)
│   └── workflow.test.ts    (29 testes)
├── infrastructure/
│   └── repositories/
│       ├── AuthRepository.ts
│       └── PurchaseRequestRepository.ts
└── pages/
    ├── login/
    ├── dashboard/
    ├── requests/
    ├── approvals/
    └── users/
```
