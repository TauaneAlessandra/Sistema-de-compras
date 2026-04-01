# Roadmap Incremental

---

## Fase 1 — Baseline técnica ✅ concluída

**Objetivo:** estabilizar o projeto para desenvolvimento contínuo.

- [x] TASK-001 — Corrigir TypeScript (`tsc --noEmit` limpo)
- [x] TASK-002 — Corrigir ESLint para cobrir `.ts` e `.tsx`
- [x] TASK-003 — Alinhar README com versões e usuários reais

---

## Fase 2 — Especificação formal ✅ concluída

**Objetivo:** documentar o que foi construído com precisão.

- [x] TASK-004 — `docs/specs/workflow-spec.md`
- [x] TASK-005 — `docs/specs/permissions-spec.md`
- [x] TASK-006 — `docs/specs/acceptance-criteria.md`

---

## Fase 3 — Design e arquitetura ✅ concluída

**Objetivo:** separar domínio, repositório e apresentação.

- [x] TASK-007 — ADRs iniciais (001, 002, 003)
- [x] TASK-008 — Extrair regras de status para `domain/workflow.ts`
- [x] TASK-009 — Criar `PurchaseRequestRepository`
- [x] TASK-010 — Criar `AuthRepository`

---

## Fase 4 — Validação com testes ✅ concluída

**Objetivo:** cobrir o núcleo do domínio com testes automatizados.

- [x] TASK-011 — Vitest configurado
- [x] TASK-012 — Testes de workflow (transições de status)
- [x] TASK-013 — Testes de permissões por perfil

---

## Fase 5 — Memória entre sessões ✅ concluída

**Objetivo:** garantir continuidade do trabalho entre sessões sem depender de memória humana.

- [x] TASK-014 — `docs/project/current-state.md`
- [x] TASK-015 — `docs/project/decision-log.md`
- [x] TASK-016 — `docs/project/session-handoff.md`
- [x] TASK-017 — `docs/project/roadmap.md`

---

## Fase 6 — Qualidade de formulários (próxima)

**Objetivo:** validação de entrada em todos os formulários.

- [ ] Instalar e configurar `zod`
- [ ] Criar schemas para `PurchaseRequest`, `User`, `Quotation`
- [ ] Integrar validação nas páginas `new/` e `users/UserModal`
- [ ] ADR 004 — validação com zod

---

## Fase 7 — Maturidade de testes

**Objetivo:** cobrir repositórios e comportamento de UI.

- [ ] Testes de `PurchaseRequestRepository` (mock de localStorage)
- [ ] Testes de `AuthRepository` (mock de localStorage)
- [ ] Testes de integração dos contextos
- [ ] Configurar `@testing-library/react` para testes de componente

---

## Fase 8 — Preparação para backend

**Objetivo:** desacoplar o código do localStorage para facilitar migração.

- [ ] Definir interfaces de repositório (`IPurchaseRequestRepository`, `IAuthRepository`)
- [ ] Criar implementações de `FetchRepository` (stubs HTTP)
- [ ] Remover dependências diretas de `localStorage` das pages e hooks
- [ ] ADR 005 — estratégia de migração para backend

---

## Fora do escopo desta iteração

- Backend real (API REST, banco de dados)
- Autenticação segura com JWT
- Upload de arquivos em servidor
- Notificações por email
- Histórico de versões por solicitação
- Multi-empresa / multi-unidade
- Relatórios exportáveis
